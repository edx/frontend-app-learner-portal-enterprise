import {
  useState, useCallback, useMemo,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '@edx/frontend-platform';
import { intentExtractionXpertService } from '../services/intentExtraction.xpert.service';
import { pathwayAssemblerXpertService } from '../services/pathwayAssembler.xpert.service';
import { facetBootstrapService } from '../services/facetBootstrap';
import { careerRetrievalService } from '../services/careerRetrieval';
import { courseRetrievalService } from '../services/courseRetrieval';
import { intakePreprocessor } from '../services/intakePreprocessor';

import useAlgoliaSearch from '../../app/data/hooks/useAlgoliaSearch';
import useEnterpriseCustomer from '../../app/data/hooks/useEnterpriseCustomer';
import useSearchCatalogs from '../../app/data/hooks/useSearchCatalogs';
import { getSupportedLocale } from '../../app/data/utils';

import {
  LearningPathway,
  CareerOption,
  LearnerProfile,
  CreateLearnerProfileArgs,
  XpertIntent,
  CareerCardModel,
  AIPathwaysResponseModel,
} from '../types';
import { catalogFacetService } from '../services/catalogFacetService';
import { catalogTranslationRules } from '../services/catalogTranslationRules';
import { catalogTranslationService } from '../services/catalogTranslationService';
import { catalogTranslationXpertService } from '../services/catalogTranslation.xpert.service';

export type PathwayStep = 'intake' | 'profile' | 'pathway';

/**
 * Hook to manage AI Learning Pathways.
 * Coordinates the multi-stage deterministic data flow:
 * 1. Intake -> Facet Bootstrap (Algolia Jobs Index)
 * 2. Intent Extraction (Xpert + Facets)
 * 3. Career Retrieval (Algolia Jobs Index)
 * 4. Selection -> Catalog Facet Grounding -> Rules-First Translation
 *    -> Optional Xpert Refinement -> Course Retrieval (Algolia Catalog Index)
 * 5. Pathway Enrichment (Xpert)
 */
export const usePathways = () => {
  const [currentStep, setCurrentStep] = useState<PathwayStep>('intake');
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile | null>(null);
  const [searchIntent, setSearchIntent] = useState<XpertIntent | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<CareerCardModel | null>(null);
  const [pathway, setPathway] = useState<LearningPathway | null>(null);
  const [pathwayResponse, setPathwayResponse] = useState<AIPathwaysResponseModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // External context for Algolia and API calls
  const config = getConfig();

  // Job/Career Index
  const {
    searchIndex: jobIndex,
  } = useAlgoliaSearch(config.ALGOLIA_INDEX_NAME_JOBS);

  // Content/Catalog Index
  const {
    searchIndex: catalogIndex,
    catalogUuidsToCatalogQueryUuids,
    shouldUseSecuredAlgoliaApiKey,
  } = useAlgoliaSearch(config.ALGOLIA_INDEX_NAME);

  const enterpriseCustomerResult = useEnterpriseCustomer();
  const enterpriseCustomer = (enterpriseCustomerResult.data || {}) as { uuid?: string, slug?: string };
  const searchCatalogs = useSearchCatalogs();

  const facetContext = useMemo(() => ({
    enterpriseCustomerUuid: enterpriseCustomer.uuid,
    searchCatalogs,
    catalogUuidsToCatalogQueryUuids,
    locale: getSupportedLocale(),
    shouldUseSecuredAlgoliaApiKey,
  }), [
    enterpriseCustomer.uuid,
    searchCatalogs,
    catalogUuidsToCatalogQueryUuids,
    shouldUseSecuredAlgoliaApiKey,
  ]);

  /**
   * Generates a learner profile and extracts search intent from intake form data.
   */
  const generateProfile = useCallback(async (args: CreateLearnerProfileArgs) => {
    if (!jobIndex) {
      throw new Error('Search index not initialized');
    }

    const requestId = uuidv4();
    const responseModel: AIPathwaysResponseModel = {
      requestId,
      stages: {} as any,
    };

    setIsLoading(true);
    setError(null);
    try {
      // 1. Facet Bootstrap (Deterministic)
      const facetStartTime = Date.now();
      const facets = await facetBootstrapService.bootstrapFacets(jobIndex);
      responseModel.stages.facetBootstrap = {
        durationMs: Date.now() - facetStartTime,
        success: true,
      };

      // 2. Preprocess Input
      const preprocessed = intakePreprocessor.preprocessInput(args);

      // 3. Intent Extraction (Xpert + Facets)
      const extractionResult = await intentExtractionXpertService.extractIntent(preprocessed, facets);
      responseModel.stages.intentExtraction = extractionResult.debug;
      const { intent } = extractionResult;
      setSearchIntent(intent);

      // 4. Career Retrieval (Algolia)
      const careerStartTime = Date.now();
      const careers = await careerRetrievalService.searchCareers(jobIndex, intent);
      responseModel.stages.careerRetrieval = {
        durationMs: Date.now() - careerStartTime,
        success: true,
        resultCount: careers.length,
      };

      // 5. Construct the UI-facing LearnerProfile
      const overview = careers.length > 0
        ? `Found ${careers.length} career matches for your goals.`
        : `We couldn't find exact matches for "${intent.condensedQuery}", but here are some recommended career paths.`;

      const profile: LearnerProfile = {
        overview,
        careerGoal: args.careerGoalRes,
        targetIndustry: args.industryRes,
        background: args.backgroundRes,
        motivation: args.bringsYouHereRes,
        learningStyle: args.learningPrefRes,
        timeAvailable: args.timeAvailableRes,
        certificate: args.certificateRes,
        careerMatches: careers.map(c => ({
          title: c.title,
          percentMatch: 95, // Placeholder
          skills: c.skills,
          industries: c.industries,
        })),
      };

      // Store the full CareerCardModel for later retrieval
      (profile as any).rawCareers = careers;

      setPathwayResponse(responseModel);
      setLearnerProfile(profile);

      if (careers.length > 0) {
        setSelectedCareer(careers[0]);
      }
      setCurrentStep('profile');
      return profile;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to generate profile:', err);
      const errorInstance = err instanceof Error ? err : new Error('Failed to generate profile');
      setError(errorInstance);
      throw errorInstance;
    } finally {
      setIsLoading(false);
    }
  }, [jobIndex]);

  /**
   * Selects a career option from the match list.
   */
  const selectCareer = useCallback((career: CareerOption) => {
    const fullCareer = (learnerProfile as any)?.rawCareers?.find((c: CareerCardModel) => c.title === career.title);
    setSelectedCareer(fullCareer || null);
  }, [learnerProfile]);

  /**
   * Generates a new learning pathway by discovering content and assembling it.
   */
  const generatePathway = useCallback(async () => {
    if (!selectedCareer || !searchIntent || !catalogIndex || !pathwayResponse) {
      throw new Error('Missing data or search index to generate pathway');
    }

    setIsLoading(true);
    setError(null);
    const updatedResponseModel = { ...pathwayResponse };

    try {
      // 1. Catalog Facet Snapshot (Deterministic, scoped by enterprise context)
      const courseStartTime = Date.now();
      const facetSnapshot = await catalogFacetService.getFacetSnapshot(catalogIndex, {}, facetContext);

      // 2. Rules-first taxonomy translation
      const rulesFirst = catalogTranslationRules.translateTaxonomyToCatalog({
        careerTitle: selectedCareer.title,
        skills: selectedCareer.skills || [],
        industries: selectedCareer.industries || [],
        similarJobs: selectedCareer.similarJobs || [],
        facetSnapshot,
      });

      // 3. Hybrid translation: run Xpert only when rules-first left unmatched terms
      let xpertRawResponse: string | undefined;
      if (rulesFirst.unmatched.length > 0) {
        try {
          const xpertResult = await catalogTranslationXpertService.translateUnmatched({
            careerTitle: selectedCareer.title,
            unmatchedSkills: rulesFirst.unmatched,
            unmatchedIndustries: selectedCareer.industries || [],
            unmatchedSimilarJobs: selectedCareer.similarJobs || [],
            facetSnapshot,
          });
          xpertRawResponse = xpertResult.rawResponse || undefined;
        } catch {
          // Xpert refinement failed — continue with rules-first output only
        }
      }

      // 4. Consolidate into final CatalogTranslation
      const translation = catalogTranslationService.processTranslation(
        selectedCareer.title,
        facetSnapshot,
        rulesFirst,
        xpertRawResponse,
      );

      // 5. Course Retrieval using consolidated translation, scoped by enterprise context
      const courses = await courseRetrievalService.fetchCourses(
        catalogIndex,
        translation,
        facetContext,
      );
      updatedResponseModel.stages.courseRetrieval = {
        durationMs: Date.now() - courseStartTime,
        success: true,
        resultCount: courses.length,
      };

      // 6. Map to LearningPathway
      const initialPathway: LearningPathway = {
        courses: courses.map(c => ({
          id: c.id,
          title: c.title,
          level: c.level || 'intermediate',
          skills: c.skills,
          status: 'not started',
          order: c.order,
          shortDescription: c.shortDescription || '',
          imageUrl: c.imageUrl || '',
          marketingUrl: c.marketingUrl || '',
        })),
      };

      // 7. Enrichment (Xpert)
      const enrichmentResult = await pathwayAssemblerXpertService.enrichWithReasoning(
        initialPathway,
        searchIntent,
      );
      updatedResponseModel.stages.pathwayEnrichment = enrichmentResult.debug;

      setPathway(enrichmentResult.pathway);
      setPathwayResponse(updatedResponseModel);
      setCurrentStep('pathway');
      return courses;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to generate pathway:', err);
      const errorInstance = err instanceof Error ? err : new Error('Failed to generate pathway');
      setError(errorInstance);
      throw errorInstance;
    } finally {
      setIsLoading(false);
    }
  }, [selectedCareer, searchIntent, catalogIndex, pathwayResponse, facetContext]);

  /**
   * Resets the entire flow state.
   */
  const reset = useCallback(() => {
    setCurrentStep('intake');
    setLearnerProfile(null);
    setSearchIntent(null);
    setSelectedCareer(null);
    setPathway(null);
    setError(null);
  }, []);

  return {
    currentStep,
    learnerProfile,
    searchIntent,
    selectedCareer,
    pathway,
    pathwayResponse,
    isLoading,
    error,
    generateProfile,
    selectCareer,
    generatePathway,
    reset,
    setCurrentStep,
  };
};
