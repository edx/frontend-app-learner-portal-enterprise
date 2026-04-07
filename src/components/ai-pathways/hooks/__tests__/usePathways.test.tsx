import { renderHook, act, waitFor } from '@testing-library/react';
import { usePathways } from '../usePathways';
import { intentExtractionService } from '../../services/intentExtraction.service';
import { contentDiscoveryService } from '../../services/contentDiscovery.service';
import { pathwayAssemblerService } from '../../services/pathwayAssembler.service';
import useAlgoliaSearch from '../../../app/data/hooks/useAlgoliaSearch';
import useEnterpriseCustomer from '../../../app/data/hooks/useEnterpriseCustomer';
import useSearchCatalogs from '../../../app/data/hooks/useSearchCatalogs';
import * as appUtils from '../../../app/data/utils';
import {
  mockIntakeInput,
  mockSearchIntent,
  mockTaxonomyUniverse,
  mockMatchedSelections,
} from '../../__tests__/fixtures';

jest.mock('@edx/frontend-platform', () => ({
  getConfig: jest.fn(() => ({
    ALGOLIA_INDEX_NAME_JOBS: 'test-index',
    OPENAI_API_KEY: 'test-key',
  })),
}));

jest.mock('../../../app/data/hooks/useAlgoliaSearch', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../app/data/hooks/useEnterpriseCustomer', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../app/data/hooks/useSearchCatalogs', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../services/intentExtraction.service', () => ({
  intentExtractionService: {
    preprocessInput: jest.fn(),
    extractIntent: jest.fn(),
  },
}));
jest.mock('../../services/contentDiscovery.service', () => ({
  contentDiscoveryService: {
    bootstrapScopedUniverse: jest.fn(),
    correlateIntentWithFacets: jest.fn(),
    refineDiscovery: jest.fn(),
  },
}));
jest.mock('../../services/pathwayAssembler.service', () => ({
  pathwayAssemblerService: {
    assemblePathway: jest.fn(),
  },
}));

describe('usePathways hook', () => {
  const mockSearchIndex = {
    search: jest.fn(),
  };

  const mockScopedHits = [
    {
      id: 'role-1',
      title: 'Software Engineer',
      description: 'Build software products.',
      skills: [{ name: 'JavaScript' }, { name: 'React' }],
      industries: ['Technology'],
      similarJobs: ['Backend Engineer'],
      jobSources: ['Software Engineer'],
    },
    {
      id: 'role-2',
      title: 'Frontend Developer',
      description: 'Build UI experiences.',
      skills: [{ name: 'TypeScript' }],
      industries: ['Technology'],
      similarJobs: ['UI Engineer'],
      jobSources: ['Frontend Developer'],
    },
  ];

  beforeEach(() => {
    jest.spyOn(appUtils, 'getSupportedLocale').mockReturnValue('en');
    jest.clearAllMocks();
    (useAlgoliaSearch as jest.Mock).mockReturnValue({
      searchIndex: mockSearchIndex,
      catalogUuidsToCatalogQueryUuids: {},
      shouldUseSecuredAlgoliaApiKey: false,
    });
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({
      data: { uuid: 'ent-123' },
    });
    (useSearchCatalogs as jest.Mock).mockReturnValue(['cat-1']);
    (contentDiscoveryService.bootstrapScopedUniverse as jest.Mock).mockResolvedValue({
      facets: mockTaxonomyUniverse,
      hits: mockScopedHits,
      totalHits: 2,
      request: {
        query: 'software engineering',
        filters: 'enterprise_customer_uuids:ent-123',
        facets: ['*'],
        hitsPerPage: 10,
        maxValuesPerFacet: 100,
        page: 0,
      },
    });
  });

  it('does not call Algolia first-pass retrieval on load', async () => {
    renderHook(() => usePathways());

    await waitFor(() => {
      expect(contentDiscoveryService.bootstrapScopedUniverse).not.toHaveBeenCalled();
    });
  });

  it('orchestrates condensed-query first-pass profile generation flow', async () => {
    const { result } = renderHook(() => usePathways());

    (intentExtractionService.preprocessInput as jest.Mock).mockReturnValue('preprocessed input');
    (intentExtractionService.extractIntent as jest.Mock).mockResolvedValue(mockSearchIntent);
    (contentDiscoveryService.correlateIntentWithFacets as jest.Mock).mockReturnValue(mockMatchedSelections);
    (contentDiscoveryService.refineDiscovery as jest.Mock).mockResolvedValue({
      hits: mockScopedHits,
      totalHits: 2,
    });

    await act(async () => {
      await result.current.generateProfile(mockIntakeInput);
    });

    expect(result.current.currentStep).toBe('profile');
    expect(result.current.searchIntent).toEqual(mockSearchIntent);
    expect(result.current.pathwayResponse?.intake.condensedQuery).toBe('software engineering');
    expect(result.current.pathwayResponse?.initialDiscovery.totalHits).toBe(2);
    expect(result.current.pathwayResponse?.matchedFacetSelections).toEqual(mockMatchedSelections);
    expect(result.current.taxonomyResults).toEqual(mockScopedHits);

    expect(contentDiscoveryService.bootstrapScopedUniverse).toHaveBeenCalledWith(
      mockSearchIndex,
      expect.objectContaining({
        enterpriseCustomerUuid: 'ent-123',
      }),
      'software engineering',
    );

    // Verify call order
    expect(intentExtractionService.extractIntent)
      .toHaveBeenCalledBefore(contentDiscoveryService.bootstrapScopedUniverse as jest.Mock);
    expect(contentDiscoveryService.bootstrapScopedUniverse)
      .toHaveBeenCalledBefore(contentDiscoveryService.correlateIntentWithFacets as jest.Mock);
    expect(contentDiscoveryService.correlateIntentWithFacets)
      .toHaveBeenCalledBefore(contentDiscoveryService.refineDiscovery as jest.Mock);
  });

  it('skips refined search when no matched facet selections are returned', async () => {
    const { result } = renderHook(() => usePathways());

    (intentExtractionService.preprocessInput as jest.Mock).mockReturnValue('preprocessed input');
    (intentExtractionService.extractIntent as jest.Mock).mockResolvedValue(mockSearchIntent);
    (contentDiscoveryService.correlateIntentWithFacets as jest.Mock).mockReturnValue({
      'skills.name': [],
      industry_names: [],
      job_sources: [],
    });

    await act(async () => {
      await result.current.generateProfile(mockIntakeInput);
    });

    expect(contentDiscoveryService.refineDiscovery).not.toHaveBeenCalled();
    expect(result.current.pathwayResponse?.refinedDiscovery.totalHits).toBe(2);
  });

  it('handles career selection and pathway generation', async () => {
    const { result } = renderHook(() => usePathways());

    (intentExtractionService.preprocessInput as jest.Mock).mockReturnValue('preprocessed input');
    (intentExtractionService.extractIntent as jest.Mock).mockResolvedValue(mockSearchIntent);
    (contentDiscoveryService.correlateIntentWithFacets as jest.Mock).mockReturnValue(mockMatchedSelections);
    (contentDiscoveryService.refineDiscovery as jest.Mock).mockResolvedValue({
      hits: mockScopedHits,
      totalHits: 2,
    });

    await act(async () => {
      await result.current.generateProfile(mockIntakeInput);
    });

    (contentDiscoveryService.refineDiscovery as jest.Mock).mockResolvedValue({
      hits: mockScopedHits,
      totalHits: 2,
    });
    (pathwayAssemblerService.assemblePathway as jest.Mock).mockReturnValue({ id: 'pathway-1' });

    await act(async () => {
      await result.current.generatePathway();
    });

    expect(result.current.currentStep).toBe('pathway');
    expect(result.current.pathway).toEqual({ id: 'pathway-1' });
  });
});

// Helper for call order assertion
// Note: Jest doesn't have toHaveBeenCalledBefore by default, we can check call counts or mock.calls
// but since we want to be explicit, let's just use simple call count logic or check if mock.calls exists
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledBefore(mock: jest.Mock): R;
    }
  }
}

expect.extend({
  toHaveBeenCalledBefore(firstMock: jest.Mock, secondMock: jest.Mock) {
    const firstCall = firstMock.mock.invocationCallOrder[0];
    const secondCall = secondMock.mock.invocationCallOrder[0];

    if (!firstCall) {
      return {
        message: () => `expected ${firstMock.getMockName()} to have been called`,
        pass: false,
      };
    }
    if (!secondCall) {
      return {
        message: () => `expected ${secondMock.getMockName()} to have been called`,
        pass: false,
      };
    }

    const pass = firstCall < secondCall;
    return {
      message: () => `expected ${firstMock.getMockName()} to have been called before ${secondMock.getMockName()}`,
      pass,
    };
  },
});
