import { renderHook, act } from '@testing-library/react';
import { usePathways } from '../usePathways';
import { facetBootstrapService } from '../../services/facetBootstrap';
import { intakePreprocessor } from '../../services/intakePreprocessor';
import { intentExtractionXpertService } from '../../services/intentExtraction.xpert.service';
import { careerRetrievalService } from '../../services/careerRetrieval';
import { courseRetrievalService } from '../../services/courseRetrieval';
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
    (careerRetrievalService.searchCareers as jest.Mock).mockResolvedValue(mockCareers);
    (courseRetrievalService.fetchCoursesForCareer as jest.Mock).mockResolvedValue(mockCourses);
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

    expect(courseRetrievalService.fetchCoursesForCareer).toHaveBeenCalled();
    expect(pathwayAssemblerXpertService.enrichWithReasoning).toHaveBeenCalled();

    expect(result.current.currentStep).toBe('pathway');
    expect(result.current.pathway?.courses).toHaveLength(1);
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
