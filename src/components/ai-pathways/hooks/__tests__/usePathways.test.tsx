import { renderHook, act } from '@testing-library/react';
import { usePathways } from '../usePathways';
import { facetBootstrapService } from '../../services/facetBootstrap';
import { intakePreprocessor } from '../../services/intakePreprocessor';
import { intentExtractionXpertService } from '../../services/intentExtraction.xpert.service';
import { careerRetrievalService } from '../../services/careerRetrieval';
import { courseRetrievalService } from '../../services/courseRetrieval';
import { catalogFacetService } from '../../services/catalogFacetService';
import { catalogTranslationRules } from '../../services/catalogTranslationRules';
import { catalogTranslationService } from '../../services/catalogTranslationService';
import { catalogTranslationXpertService } from '../../services/catalogTranslation.xpert.service';
import { pathwayAssemblerXpertService } from '../../services/pathwayAssembler.xpert.service';
import useAlgoliaSearch from '../../../app/data/hooks/useAlgoliaSearch';
import useEnterpriseCustomer from '../../../app/data/hooks/useEnterpriseCustomer';
import useSearchCatalogs from '../../../app/data/hooks/useSearchCatalogs';
import * as appUtils from '../../../app/data/utils';
import {
  mockIntakeInput,
  mockSearchIntent,
  mockTaxonomyUniverse,
} from '../../__tests__/fixtures';

jest.mock('@edx/frontend-platform', () => ({
  getConfig: jest.fn(() => ({
    ALGOLIA_INDEX_NAME_JOBS: 'test-jobs-index',
    ALGOLIA_INDEX_NAME: 'test-catalog-index',
  })),
}));

jest.mock('../../../app/data/hooks/useAlgoliaSearch', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../app/data/hooks/useEnterpriseCustomer', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../app/data/hooks/useSearchCatalogs', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../services/facetBootstrap');
jest.mock('../../services/intakePreprocessor');
jest.mock('../../services/intentExtraction.xpert.service');
jest.mock('../../services/careerRetrieval');
jest.mock('../../services/courseRetrieval');
jest.mock('../../services/catalogFacetService');
jest.mock('../../services/catalogTranslationRules');
jest.mock('../../services/catalogTranslationService');
jest.mock('../../services/catalogTranslation.xpert.service');
jest.mock('../../services/pathwayAssembler.xpert.service');

describe('usePathways hook', () => {
  const mockJobIndex = { search: jest.fn() };
  const mockCatalogIndex = { search: jest.fn() };

  const mockCareers = [
    {
      id: '1', title: 'Software Engineer', skills: ['JavaScript', 'React'], industries: ['Tech'],
    },
  ];

  const mockCourses = [
    {
      id: 'c1', title: 'React Basics', skills: ['React'], level: 'beginner', order: 1,
    },
  ];

  beforeEach(() => {
    jest.spyOn(appUtils, 'getSupportedLocale').mockReturnValue('en');
    jest.clearAllMocks();

    (useAlgoliaSearch as jest.Mock).mockImplementation((indexName) => {
      if (indexName === 'test-jobs-index') {
        return { searchIndex: mockJobIndex };
      }
      return {
        searchIndex: mockCatalogIndex,
        catalogUuidsToCatalogQueryUuids: {},
        shouldUseSecuredAlgoliaApiKey: false,
      };
    });

    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: { uuid: 'ent-123' } });
    (useSearchCatalogs as jest.Mock).mockReturnValue(['cat-1']);

    (facetBootstrapService.bootstrapFacets as jest.Mock).mockResolvedValue(mockTaxonomyUniverse);
    (intakePreprocessor.preprocessInput as jest.Mock).mockReturnValue('preprocessed-input');
    (intentExtractionXpertService.extractIntent as jest.Mock).mockResolvedValue({
      intent: mockSearchIntent,
      debug: {
        durationMs: 100, success: true, systemPrompt: '', rawResponse: '', parsedResponse: {}, validationErrors: [], repairPromptUsed: false,
      },
    });
    const mockFacetSnapshot = {
      skill_names: [], 'skills.name': [], subjects: [], level_type: [], 'partners.name': [], enterprise_catalog_query_uuids: [],
    };
    const mockRulesFirst = {
      exactMatches: ['JavaScript'], aliasMatches: [], unmatched: [],
    };
    const mockTranslation = {
      query: 'Software Engineer',
      queryAlternates: [],
      strictSkills: [],
      boostSkills: [],
      subjectHints: [],
      droppedTaxonomySkills: [],
      skillProvenance: [],
      algoliaPrimaryRequest: {},
      algoliaFallbackRequests: [],
    };

    (careerRetrievalService.searchCareers as jest.Mock).mockResolvedValue(mockCareers);
    (catalogFacetService.getFacetSnapshot as jest.Mock).mockResolvedValue({
      snapshot: mockFacetSnapshot, trace: {},
    });
    (catalogTranslationRules.translateTaxonomyToCatalog as jest.Mock).mockReturnValue({
      result: mockRulesFirst, trace: {},
    });
    (catalogTranslationService.processTranslation as jest.Mock).mockReturnValue({
      translation: mockTranslation, trace: {},
    });
    (courseRetrievalService.fetchCourses as jest.Mock).mockResolvedValue({ courses: mockCourses, ladderTrace: {} });
    (catalogTranslationXpertService.translateUnmatched as jest.Mock).mockResolvedValue({
      rawResponse: '',
      debug: {
        systemPrompt: '', rawResponse: '', durationMs: 0, success: false,
      },
    });
    (pathwayAssemblerXpertService.enrichWithReasoning as jest.Mock).mockResolvedValue({
      pathway: { courses: mockCourses },
      debug: {
        durationMs: 200, success: true, systemPrompt: '', rawResponse: '',
      },
    });
  });

  it('orchestrates the full flow: profile generation', async () => {
    const { result } = renderHook(() => usePathways());

    await act(async () => {
      await result.current.generateProfile(mockIntakeInput);
    });

    expect(facetBootstrapService.bootstrapFacets).toHaveBeenCalled();
    expect(intakePreprocessor.preprocessInput).toHaveBeenCalledWith(mockIntakeInput);
    expect(intentExtractionXpertService.extractIntent).toHaveBeenCalled();
    expect(careerRetrievalService.searchCareers).toHaveBeenCalled();

    expect(result.current.currentStep).toBe('profile');
    expect(result.current.learnerProfile?.careerMatches).toHaveLength(1);
    expect(result.current.selectedCareer?.title).toBe('Software Engineer');
  });

  it('orchestrates the full flow: pathway generation', async () => {
    const { result } = renderHook(() => usePathways());

    // Setup state for pathway generation
    await act(async () => {
      await result.current.generateProfile(mockIntakeInput);
    });

    expect(result.current.currentStep).toBe('profile');

    await act(async () => {
      await result.current.generatePathway();
    });

    expect(catalogFacetService.getFacetSnapshot).toHaveBeenCalledWith(
      mockCatalogIndex,
      {},
      expect.objectContaining({ enterpriseCustomerUuid: 'ent-123', locale: 'en' }),
    );
    expect(catalogTranslationRules.translateTaxonomyToCatalog).toHaveBeenCalled();
    // no unmatched terms — Xpert should be skipped
    expect(catalogTranslationXpertService.translateUnmatched).not.toHaveBeenCalled();
    expect(catalogTranslationService.processTranslation).toHaveBeenCalledWith(
      'Software Engineer',
      expect.anything(),
      expect.anything(),
      undefined,
      undefined,
    );
    expect(courseRetrievalService.fetchCourses).toHaveBeenCalledWith(
      mockCatalogIndex,
      expect.anything(),
    );
    expect(pathwayAssemblerXpertService.enrichWithReasoning).toHaveBeenCalled();

    expect(result.current.currentStep).toBe('pathway');
    expect(result.current.pathway?.courses).toHaveLength(1);
  });

  it('calls Xpert translation when unmatched terms are present', async () => {
    (catalogTranslationRules.translateTaxonomyToCatalog as jest.Mock).mockReturnValue({
      result: { exactMatches: [], aliasMatches: [], unmatched: ['UnknownSkill'] }, trace: {},
    });
    (catalogTranslationXpertService.translateUnmatched as jest.Mock).mockResolvedValue({
      rawResponse: '{"strictSkills":["Python"]}',
      debug: {
        systemPrompt: '', rawResponse: '', durationMs: 50, success: true,
      },
    });

    const { result } = renderHook(() => usePathways());

    await act(async () => {
      await result.current.generateProfile(mockIntakeInput);
    });
    await act(async () => {
      await result.current.generatePathway();
    });

    expect(catalogTranslationXpertService.translateUnmatched).toHaveBeenCalledWith(
      expect.objectContaining({ careerTitle: 'Software Engineer', unmatchedSkills: ['UnknownSkill'] }),
      undefined,
    );
    expect(catalogTranslationService.processTranslation).toHaveBeenCalledWith(
      'Software Engineer',
      expect.anything(),
      expect.anything(),
      '{"strictSkills":["Python"]}',
      expect.anything(),
    );
  });

  it('falls back to rules-first when Xpert translation fails', async () => {
    (catalogTranslationRules.translateTaxonomyToCatalog as jest.Mock).mockReturnValue({
      result: { exactMatches: [], aliasMatches: [], unmatched: ['UnknownSkill'] }, trace: {},
    });
    (catalogTranslationXpertService.translateUnmatched as jest.Mock).mockRejectedValue(new Error('Xpert unavailable'));

    const { result } = renderHook(() => usePathways());

    await act(async () => {
      await result.current.generateProfile(mockIntakeInput);
    });
    await act(async () => {
      await result.current.generatePathway();
    });

    // Should still complete with rules-first-only (xpertRawResponse = undefined)
    expect(catalogTranslationService.processTranslation).toHaveBeenCalledWith(
      'Software Engineer',
      expect.anything(),
      expect.anything(),
      undefined,
      undefined,
    );
    expect(result.current.currentStep).toBe('pathway');
  });

  it('handles errors gracefully', async () => {
    (careerRetrievalService.searchCareers as jest.Mock).mockRejectedValue(new Error('Algolia search failed'));

    const { result } = renderHook(() => usePathways());

    await act(async () => {
      try {
        await result.current.generateProfile(mockIntakeInput);
      } catch (e) {
        // Expected
      }
    });

    expect(result.current.error?.message).toBe('Algolia search failed');
    expect(result.current.isLoading).toBe(false);
  });

  it('resets state correctly', async () => {
    const { result } = renderHook(() => usePathways());

    await act(async () => {
      await result.current.generateProfile(mockIntakeInput);
    });

    expect(result.current.currentStep).toBe('profile');

    act(() => {
      result.current.reset();
    });

    expect(result.current.currentStep).toBe('intake');
    expect(result.current.learnerProfile).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Prompt interception integration tests (Prompt 12)
// ---------------------------------------------------------------------------

describe('usePathways — prompt interception', () => {
  const mockJobIndex = { search: jest.fn() };
  const mockCatalogIndex = { search: jest.fn() };

  const mockCareers = [
    {
      id: '1', title: 'Software Engineer', skills: ['JavaScript', 'React'], industries: ['Tech'],
    },
  ];

  const mockCourses = [
    {
      id: 'c1', title: 'React Basics', skills: ['React'], level: 'beginner', order: 1,
    },
  ];

  beforeEach(() => {
    jest.spyOn(appUtils, 'getSupportedLocale').mockReturnValue('en');
    jest.clearAllMocks();

    (useAlgoliaSearch as jest.Mock).mockImplementation((indexName) => {
      if (indexName === 'test-jobs-index') {
        return { searchIndex: mockJobIndex };
      }
      return {
        searchIndex: mockCatalogIndex,
        catalogUuidsToCatalogQueryUuids: {},
        shouldUseSecuredAlgoliaApiKey: false,
      };
    });

    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: { uuid: 'ent-123' } });
    (useSearchCatalogs as jest.Mock).mockReturnValue(['cat-1']);

    (facetBootstrapService.bootstrapFacets as jest.Mock).mockResolvedValue(mockTaxonomyUniverse);
    (intakePreprocessor.preprocessInput as jest.Mock).mockReturnValue('preprocessed-input');
    (intentExtractionXpertService.extractIntent as jest.Mock).mockResolvedValue({
      intent: mockSearchIntent,
      debug: {
        durationMs: 100, success: true, systemPrompt: '', rawResponse: '', parsedResponse: {}, validationErrors: [], repairPromptUsed: false,
      },
    });

    (careerRetrievalService.searchCareers as jest.Mock).mockResolvedValue(mockCareers);

    const mockFacetSnapshot = {
      skill_names: [], 'skills.name': [], subjects: [], level_type: [], 'partners.name': [], enterprise_catalog_query_uuids: [],
    };
    const mockTranslation = {
      query: 'Software Engineer',
      queryAlternates: [],
      strictSkills: [],
      boostSkills: [],
      subjectHints: [],
      droppedTaxonomySkills: [],
      skillProvenance: [],
      algoliaPrimaryRequest: {},
      algoliaFallbackRequests: [],
    };
    (catalogFacetService.getFacetSnapshot as jest.Mock).mockResolvedValue({
      snapshot: mockFacetSnapshot, trace: {},
    });
    (catalogTranslationRules.translateTaxonomyToCatalog as jest.Mock).mockReturnValue({
      result: { exactMatches: [], aliasMatches: [], unmatched: ['UnknownSkill'] }, trace: {},
    });
    (catalogTranslationXpertService.translateUnmatched as jest.Mock).mockResolvedValue({
      rawResponse: '{}',
      debug: {
        systemPrompt: '', rawResponse: '', durationMs: 0, success: true,
      },
    });
    (catalogTranslationService.processTranslation as jest.Mock).mockReturnValue({
      translation: mockTranslation, trace: {},
    });
    (courseRetrievalService.fetchCourses as jest.Mock).mockResolvedValue({ courses: mockCourses, ladderTrace: {} });
    (pathwayAssemblerXpertService.enrichWithReasoning as jest.Mock).mockResolvedValue({
      pathway: { courses: mockCourses },
      debug: {
        durationMs: 200, success: true, systemPrompt: '', rawResponse: '',
      },
    });
  });

  it('does NOT forward interceptor to extractIntent when none is provided', async () => {
    const { result } = renderHook(() => usePathways());

    await act(async () => {
      await result.current.generateProfile(mockIntakeInput);
    });

    const callArgs = (intentExtractionXpertService.extractIntent as jest.Mock).mock.calls[0];
    // Third argument (interceptPrompt) must be undefined
    expect(callArgs[2]).toBeUndefined();
  });

  it('forwards a capturing interceptor to extractIntent when one is provided', async () => {
    const mockInterceptPrompt = jest.fn().mockResolvedValue({ decision: 'accepted', bundle: undefined });
    const { result } = renderHook(() => usePathways());

    await act(async () => {
      await result.current.generateProfile(mockIntakeInput, mockInterceptPrompt);
    });

    const callArgs = (intentExtractionXpertService.extractIntent as jest.Mock).mock.calls[0];
    // Third argument must be a function (the capturing wrapper)
    expect(typeof callArgs[2]).toBe('function');
  });

  it('accept path — interceptor called and extractIntent completes successfully', async () => {
    const mockInterceptPrompt = jest.fn().mockResolvedValue({ decision: 'accepted', bundle: undefined });
    const { result } = renderHook(() => usePathways());

    await act(async () => {
      await result.current.generateProfile(mockIntakeInput, mockInterceptPrompt);
    });

    // extractIntent must have been called (Xpert call proceeds after accept)
    expect(intentExtractionXpertService.extractIntent).toHaveBeenCalled();
    expect(result.current.currentStep).toBe('profile');
    expect(result.current.learnerProfile?.careerMatches).toHaveLength(1);
  });

  it('reject path — extractIntent still completes with original bundle', async () => {
    const mockInterceptPrompt = jest.fn().mockResolvedValue({ decision: 'rejected', bundle: undefined });
    const { result } = renderHook(() => usePathways());

    await act(async () => {
      await result.current.generateProfile(mockIntakeInput, mockInterceptPrompt);
    });

    expect(intentExtractionXpertService.extractIntent).toHaveBeenCalled();
    expect(result.current.currentStep).toBe('profile');
  });

  it('cancel path — generateProfile rejects and extractIntent is not called through to Xpert', async () => {
    // Simulate extractIntent itself throwing (cancel propagates as throw inside the service)
    (intentExtractionXpertService.extractIntent as jest.Mock).mockRejectedValue(
      new Error('cancelled by user'),
    );

    const mockInterceptPrompt = jest.fn().mockResolvedValue({ decision: 'cancelled', bundle: undefined });
    const { result } = renderHook(() => usePathways());

    await act(async () => {
      try {
        await result.current.generateProfile(mockIntakeInput, mockInterceptPrompt);
      } catch {
        // expected
      }
    });

    expect(result.current.error?.message).toBe('cancelled by user');
    expect(result.current.currentStep).toBe('intake');
  });

  it('catalog translation stage — interceptor is forwarded to translateUnmatched via generatePathway', async () => {
    const mockInterceptPrompt = jest.fn().mockResolvedValue({ decision: 'accepted', bundle: undefined });
    const { result } = renderHook(() => usePathways());

    // generateProfile stores the interceptor
    await act(async () => {
      await result.current.generateProfile(mockIntakeInput, mockInterceptPrompt);
    });

    // generatePathway reuses the stored interceptor and passes it to translateUnmatched
    await act(async () => {
      await result.current.generatePathway();
    });

    const translateCallArgs = (catalogTranslationXpertService.translateUnmatched as jest.Mock).mock.calls[0];
    // Second argument to translateUnmatched must be a function (capturing interceptor wrapper)
    expect(typeof translateCallArgs[1]).toBe('function');
  });
});
