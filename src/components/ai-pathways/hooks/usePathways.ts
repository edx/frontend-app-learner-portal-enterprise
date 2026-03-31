import {
  useState, useCallback, useEffect, useRef,
} from 'react';
import { getConfig } from '@edx/frontend-platform';
import { intentExtractionService } from '../services/intentExtraction.service';
import { buildAlgoliaRequest } from '../services/algoliaRequestBuilder';
import { contentDiscoveryService } from '../services/contentDiscovery.service';
import { pathwayAssemblerService } from '../services/pathwayAssembler.service';

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
} from '../types';
import {
  adaptAlgoliaHitsToCandidates,
  adaptAlgoliaTaxonomyHits,
  adaptAlgoliaFacets,
  adaptTaxonomyResultsToCareerOptions,
  AlgoliaTaxonomyHit,
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

  const bootstrapCalled = useRef(false);

  useEffect(() => {
    const bootstrap = async () => {
      if (!searchIndex || bootstrapCalled.current || !enterpriseCustomer.uuid) {
        return;
      }
      bootstrapCalled.current = true;
      try {
        const facets = await contentDiscoveryService.bootstrapFacets(searchIndex, {
          enterpriseCustomerUuid: enterpriseCustomer.uuid,
          searchCatalogs,
          catalogUuidsToCatalogQueryUuids,
          locale: getSupportedLocale(),
          shouldUseSecuredAlgoliaApiKey,
        });
        setTaxonomyFilters(facets);
        console.log('[AI-Pathways] Deterministic bootstrap complete. Facets:', facets);
      } catch (err) {
        console.error('[AI-Pathways] Deterministic bootstrap failed:', err);
      }
    };
    bootstrap();
  }, [
    searchIndex,
    enterpriseCustomer.uuid,
    searchCatalogs,
    catalogUuidsToCatalogQueryUuids,
    shouldUseSecuredAlgoliaApiKey,
  ]);

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

      // 2. Phase A: Metadata Bootstrap
      // Bootstrap now runs automatically on load via useEffect.
      // We only ensure we have currentFacets available for intent extraction.
      const currentFacets = taxonomyFilters;

      // 3. Phase B: Intent Extraction (using bootstrap facets for better semantic mapping)
      const intent = await intentExtractionService.extractIntent(preprocessed, apiKey, currentFacets);
      setSearchIntent(intent);

      // 4. Phase C: Selection Retrieval (Refined search based on extracted intent)
      const refinedRequestInput = buildAlgoliaRequest({
        intent,
        mode: 'assembly',
        context: {
          enterpriseCustomerUuid: enterpriseCustomer.uuid,
          catalogQueryUuids: searchCatalogs,
          locale: getSupportedLocale(),
        },
      });

      const refinedResponse = await contentDiscoveryService.discoverContent(searchIndex, refinedRequestInput);
      const refinedResults = adaptAlgoliaTaxonomyHits(refinedResponse.hits as AlgoliaTaxonomyHit[]);
      const refinedFacets = adaptAlgoliaFacets(refinedResponse.facets || {});

      setTaxonomyResults(refinedResults);
      setTaxonomyFilters(refinedFacets);

      // 5. Map Real Results to Career Matches for Profile View
      const careerMatches = adaptTaxonomyResultsToCareerOptions(refinedResults);

      // 6. Construct the UI-facing LearnerProfile
      const result: LearnerProfile = {
        overview: `Targeting roles like ${intent.roles.join(', ')}.`,
        careerGoal: args.careerGoalRes,
        targetIndustry: args.industryRes,
        background: args.backgroundRes,
        motivation: args.bringsYouHereRes,
        learningStyle: args.learningPrefRes,
        timeAvailable: args.timeAvailableRes,
        certificate: args.certificateRes,
        careerMatches,
      };

      setLearnerProfile(result);
      if (result.careerMatches.length > 0) {
        setSelectedCareer(result.careerMatches[0]);
      }
      setCurrentStep('profile');
      return result;
    } catch (err) {
      console.error('Failed to generate profile:', err);
      const errorInstance = err instanceof Error ? err : new Error('Failed to generate profile');
      setError(errorInstance);
      throw errorInstance;
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, searchIndex, enterpriseCustomer.uuid, searchCatalogs]);

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
      // 1. Map SearchIntent to Algolia Request (Taxonomy Centric)
      const requestInput = buildAlgoliaRequest({
        intent: {
          ...searchIntent,
          roles: [selectedCareer.title], // Prioritize the selected career role
        },
        mode: 'assembly',
        context: {
          enterpriseCustomerUuid: enterpriseCustomer.uuid,
          catalogQueryUuids: searchCatalogs,
          locale: getSupportedLocale(),
        },
      });

      // 2. Discover Content (Algolia Taxonomy Retrieval)
      const searchResults = await contentDiscoveryService.discoverContent(searchIndex, requestInput);

      // 3. Adapter Layer (Normalization)
      const results = adaptAlgoliaTaxonomyHits(searchResults.hits as AlgoliaTaxonomyHit[]);
      const facets = adaptAlgoliaFacets(searchResults.facets || {});

      setTaxonomyResults(results);
      setTaxonomyFilters(facets);

      // 4. (Temporary) Keep a mock pathway for components that still expect one
      const candidates = adaptAlgoliaHitsToCandidates(searchResults.hits as any);
      const initialPathway = pathwayAssemblerService.assemblePathway(candidates);
      setPathway(initialPathway);

      setCurrentStep('pathway');
      return results;
    } catch (err) {
      console.error('Failed to generate pathway:', err);
      const errorInstance = err instanceof Error ? err : new Error('Failed to generate pathway');
      setError(errorInstance);
      throw errorInstance;
    } finally {
      setIsLoading(false);
    }
  }, [selectedCareer, searchIntent, searchIndex, enterpriseCustomer.uuid, searchCatalogs, apiKey]);

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
    isLoading,
    error,
    generateProfile,
    selectCareer,
    generatePathway,
    reset,
    setCurrentStep,
  };
};
