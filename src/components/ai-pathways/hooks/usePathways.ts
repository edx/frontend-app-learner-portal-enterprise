import {
  useState, useCallback,
} from 'react';
import { getConfig } from '@edx/frontend-platform';
import { intentExtractionService } from '../services/intentExtraction.service';
import { intentExtractionXpertService } from '../services/intentExtraction.xpert.service';
import { contentDiscoveryService } from '../services/contentDiscovery.service';
import { pathwayAssemblerService } from '../services/pathwayAssembler.service';
import { pathwayAssemblerXpertService } from '../services/pathwayAssembler.xpert.service';

import useAlgoliaSearch from '../../app/data/hooks/useAlgoliaSearch';
import useEnterpriseCustomer from '../../app/data/hooks/useEnterpriseCustomer';
import useSearchCatalogs from '../../app/data/hooks/useSearchCatalogs';
import { getSupportedLocale } from '../../app/data/utils';

import {
  LearningPathway,
  CareerOption,
  LearnerProfile,
  CreateLearnerProfileArgs,
  SearchIntent,
  TaxonomyResult,
  TaxonomyFilters,
  AIPathwaysResponseModel,
} from '../types';
import {
  adaptAlgoliaHitsToCandidates,
  adaptTaxonomyResultsToCareerOptions,
} from '../services/algolia.adapters';

export type PathwayStep = 'intake' | 'profile' | 'pathway';

/**
 * Hook to manage AI Learning Pathways.
 * Coordinates the multi-stage data flow:
 * 1. Intake -> SearchIntent + Career Matching (OpenAI)
 * 2. Selection -> Content Discovery (Algolia Taxonomy)
 * 3. Assembly -> Career Discovery Results (Normalized Taxonomy)
 */
export const usePathways = () => {
  const [currentStep, setCurrentStep] = useState<PathwayStep>('intake');
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile | null>(null);
  const [searchIntent, setSearchIntent] = useState<SearchIntent | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<CareerOption | null>(null);
  const [pathway, setPathway] = useState<LearningPathway | null>(null);
  const [taxonomyResults, setTaxonomyResults] = useState<TaxonomyResult[]>([]);
  const [taxonomyFilters, setTaxonomyFilters] = useState<TaxonomyFilters | null>(null);
  const [pathwayResponse, setPathwayResponse] = useState<AIPathwaysResponseModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // External context for Algolia and API calls
  const {
    searchIndex,
    catalogUuidsToCatalogQueryUuids,
    shouldUseSecuredAlgoliaApiKey,
  } = useAlgoliaSearch(getConfig().ALGOLIA_INDEX_NAME_JOBS);
  const enterpriseCustomerResult = useEnterpriseCustomer();
  const enterpriseCustomer = (enterpriseCustomerResult.data || {}) as { uuid?: string };
  const searchCatalogs = useSearchCatalogs();
  const apiKey = getConfig().OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const USE_XPERT_API = getConfig().USE_XPERT_API === 'true' || getConfig().USE_XPERT_API === true || false;

  /**
   * Generates a learner profile and extracts search intent from intake form data.
   */
  const generateProfile = useCallback(async (args: CreateLearnerProfileArgs) => {
    if (!searchIndex) {
      throw new Error('Search index not initialized');
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Preprocess Input
      const preprocessed = intentExtractionService.preprocessInput(args);

      // 2. Phase A: Intent Extraction (first OpenAI call)
      // Xpert API path — replaces direct OpenAI call when USE_XPERT_API=true
      const intent = USE_XPERT_API
        ? await intentExtractionXpertService.extractIntent(preprocessed, null)
        : await intentExtractionService.extractIntent(preprocessed, apiKey, null);
      setSearchIntent(intent);

      // 3. Phase B: First Algolia Request (condensed query + base scope)
      const scopedUniverse = await contentDiscoveryService.bootstrapScopedUniverse(
        searchIndex,
        {
          enterpriseCustomerUuid: enterpriseCustomer.uuid,
          searchCatalogs,
          catalogUuidsToCatalogQueryUuids,
          locale: getSupportedLocale(),
          shouldUseSecuredAlgoliaApiKey,
        },
        intent.condensedQuery,
      );

      setTaxonomyFilters(scopedUniverse.facets);
      setTaxonomyResults(scopedUniverse.hits);

      // 4. Phase C: Correlate Intent against Available Facets
      const matchedSelections = contentDiscoveryService.correlateIntentWithFacets(intent, scopedUniverse.facets);

      // 5. Phase D: Optional refined discovery (only when we have matched selections)
      const hasRefinements = Object.values(matchedSelections).some(values => values.length > 0);
      const refinedDiscovery = hasRefinements
        ? await contentDiscoveryService.refineDiscovery(
          searchIndex,
          {
            enterpriseCustomerUuid: enterpriseCustomer.uuid,
            searchCatalogs,
            catalogUuidsToCatalogQueryUuids,
            locale: getSupportedLocale(),
          },
          matchedSelections,
          intent.condensedQuery,
        )
        : {
          hits: scopedUniverse.hits,
          totalHits: scopedUniverse.totalHits,
        };

      setTaxonomyResults(scopedUniverse.hits);

      // 6. Build profile from initial real data so page can render immediately
      let careerMatches = adaptTaxonomyResultsToCareerOptions(scopedUniverse.hits);

      // Xpert Fallback: If no results found, ask Xpert for sample careers
      if (careerMatches.length === 0 && USE_XPERT_API) {
        careerMatches = await intentExtractionXpertService.generateSampleCareers(preprocessed);
      }

      const inferredCareer = scopedUniverse.hits[0]?.title || intent.roles[0] || 'Career Explorer';

      // Derive metadata from either Algolia hits or Xpert sample careers
      const sourceData = scopedUniverse.hits.length > 0 ? scopedUniverse.hits : careerMatches;
      const topSkills = sourceData
        .flatMap(item => {
          if ('skills' in item && Array.isArray(item.skills)) {
            return item.skills.map(skill => (typeof skill === 'string' ? skill : skill.name));
          }
          return [];
        })
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .slice(0, 5);

      const topIndustries = sourceData
        .flatMap(item => ('industries' in item ? item.industries || [] : []))
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .slice(0, 5);

      const topSimilarJobs = scopedUniverse.hits
        .flatMap(hit => hit.similarJobs)
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .slice(0, 5);

      // 7. Construct the UI-facing LearnerProfile
      const overview = scopedUniverse.totalHits > 0
        ? `Initial discovery for "${intent.condensedQuery}" returned ${scopedUniverse.totalHits} scoped matches.`
        : `We couldn't find exact matches for "${intent.condensedQuery}" in our current catalog, but here are some recommended career paths based on your profile.`;

      const profile: LearnerProfile = {
        overview,
        careerGoal: args.careerGoalRes,
        targetIndustry: args.industryRes,
        background: args.backgroundRes,
        motivation: args.bringsYouHereRes,
        learningStyle: args.learningPrefRes,
        timeAvailable: args.timeAvailableRes,
        certificate: args.certificateRes,
        careerMatches,
      };

      // 8. Build the complete Response Model (Phase 4 Deliverable)
      const responseModel: AIPathwaysResponseModel = {
        intake: {
          rawQuery: [
            args.bringsYouHereRes,
            args.careerGoalRes,
            args.backgroundRes,
            args.industryRes,
          ].join(' | '),
          condensedQuery: intent.condensedQuery,
        },
        initialDiscovery: {
          hits: scopedUniverse.hits,
          totalHits: scopedUniverse.totalHits,
          availableFacets: scopedUniverse.facets,
          inferredCareer,
          topSkills,
          topIndustries,
          similarJobs: topSimilarJobs,
          firstRequest: scopedUniverse.request,
        },
        intent,
        scopedFacetUniverse: scopedUniverse.facets,
        matchedFacetSelections: matchedSelections,
        refinedDiscovery,
        learnerProfile: profile,
        pathwayInputs: {
          candidateContent: refinedDiscovery.hits,
          matchedTaxonomySignals: [
            ...matchedSelections['skills.name'],
            ...matchedSelections.industry_names,
          ],
        },
      };

      setPathwayResponse(responseModel);
      setLearnerProfile(profile);

      if (profile.careerMatches.length > 0) {
        setSelectedCareer(profile.careerMatches[0]);
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
  }, [
    apiKey,
    searchIndex,
    enterpriseCustomer.uuid,
    searchCatalogs,
    catalogUuidsToCatalogQueryUuids,
    shouldUseSecuredAlgoliaApiKey,
    USE_XPERT_API,
  ]);

  /**
   * Selects a career option from the match list.
   */
  const selectCareer = useCallback((career: CareerOption) => {
    setSelectedCareer(career);
  }, []);

  /**
   * Generates a new learning pathway by discovering content and assembling it.
   */
  const generatePathway = useCallback(async () => {
    if (!selectedCareer || !searchIntent || !searchIndex) {
      throw new Error('Missing data or search index to generate pathway');
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Prepare refinements based on selected career
      const selections = {
        'skills.name': [
          ...(pathwayResponse?.matchedFacetSelections['skills.name'] || []),
          ...(selectedCareer.skills || []),
        ],
        industry_names: [
          ...(pathwayResponse?.matchedFacetSelections.industry_names || []),
          ...(selectedCareer.industries || []),
        ],
        job_sources: [
          ...(pathwayResponse?.matchedFacetSelections.job_sources || []),
          ...(selectedCareer.jobSources || []),
        ],
      };

      // 2. Discover Content (Algolia Taxonomy Retrieval via Refined Discovery)
      const refinedDiscovery = await contentDiscoveryService.refineDiscovery(
        searchIndex,
        {
          enterpriseCustomerUuid: enterpriseCustomer.uuid,
          searchCatalogs,
          catalogUuidsToCatalogQueryUuids,
          locale: getSupportedLocale(),
        },
        selections,
        searchIntent.condensedQuery,
      );

      // 3. Adapter Layer (Normalization)
      setTaxonomyResults(refinedDiscovery.hits);

      // 4. (Temporary) Keep a mock pathway for components that still expect one
      const candidates = adaptAlgoliaHitsToCandidates(refinedDiscovery.hits as any);
      const initialPathway = pathwayAssemblerService.assemblePathway(candidates);

      // Xpert API path — replaces direct OpenAI call when USE_XPERT_API=true
      const enrichedPathway = USE_XPERT_API
        ? await pathwayAssemblerXpertService.enrichWithReasoning(initialPathway, searchIntent)
        : await pathwayAssemblerService.enrichWithReasoning(initialPathway, searchIntent, apiKey);

      setPathway(enrichedPathway);

      setCurrentStep('pathway');
      return refinedDiscovery.hits;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to generate pathway:', err);
      const errorInstance = err instanceof Error ? err : new Error('Failed to generate pathway');
      setError(errorInstance);
      throw errorInstance;
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedCareer,
    searchIntent,
    searchIndex,
    enterpriseCustomer.uuid,
    searchCatalogs,
    catalogUuidsToCatalogQueryUuids,
    pathwayResponse,
    USE_XPERT_API,
    apiKey,
  ]);

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
    taxonomyResults,
    taxonomyFilters,
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
