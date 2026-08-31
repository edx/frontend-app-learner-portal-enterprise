import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import {
  filterCourseKeysByEnterpriseCatalog,
  EnterpriseCatalogInclusionError,
} from './enterpriseCatalogInclusion';

jest.mock('@edx/frontend-platform', () => ({
  ...jest.requireActual('@edx/frontend-platform'),
  getConfig: jest.fn(),
}));
jest.mock('@edx/frontend-platform/auth', () => ({
  getAuthenticatedHttpClient: jest.fn(),
}));

const mockedGetConfig = getConfig as jest.Mock;
const mockedGetAuthenticatedHttpClient = getAuthenticatedHttpClient as jest.Mock;
const mockPost = jest.fn();

const mockFilteredContentResponse = (filteredContentKeys: unknown) => {
  mockPost.mockResolvedValue({ data: { filtered_content_keys: filteredContentKeys } });
};

describe('filterCourseKeysByEnterpriseCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetConfig.mockReturnValue({ ENTERPRISE_CATALOG_API_BASE_URL: 'http://test-catalog.example' });
    mockedGetAuthenticatedHttpClient.mockReturnValue({ post: mockPost });
  });

  it('posts to the exact endpoint URL with the enterprise UUID interpolated', async () => {
    mockFilteredContentResponse(['A']);

    await filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: ['catalog-1'],
      candidateCourseKeys: ['A'],
    });

    expect(mockPost).toHaveBeenCalledWith(
      'http://test-catalog.example/api/v1/enterprise-customer/enterprise-uuid-1/filter_content_items/',
      expect.anything(),
    );
  });

  it('sends the exact snake_case body field names', async () => {
    mockFilteredContentResponse(['A']);

    await filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: ['catalog-1'],
      candidateCourseKeys: ['A'],
    });

    const [, body] = mockPost.mock.calls[0];
    expect(body).toEqual({ content_keys: ['A'], catalog_uuids: ['catalog-1'] });
  });

  it('trims, drops blanks, and deduplicates candidate keys while preserving first-seen order', async () => {
    mockFilteredContentResponse(['A', 'B', 'C']);

    await filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: ['catalog-1'],
      candidateCourseKeys: [' A ', 'B', 'A', '  ', 'C'],
    });

    const [, body] = mockPost.mock.calls[0];
    expect(body.content_keys).toEqual(['A', 'B', 'C']);
  });

  it('trims, drops blanks, and deduplicates catalog UUIDs', async () => {
    mockFilteredContentResponse(['A']);

    await filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: [' catalog-1 ', 'catalog-2', 'catalog-1', '  '],
      candidateCourseKeys: ['A'],
    });

    const [, body] = mockPost.mock.calls[0];
    expect(body.catalog_uuids).toEqual(['catalog-1', 'catalog-2']);
  });

  it('makes zero HTTP calls and returns [] for an empty candidate list', async () => {
    const result = await filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: ['catalog-1'],
      candidateCourseKeys: [],
    });

    expect(result).toEqual([]);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('makes zero HTTP calls and returns [] when candidates normalize to empty (all blank)', async () => {
    const result = await filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: ['catalog-1'],
      candidateCourseKeys: ['  ', ''],
    });

    expect(result).toEqual([]);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects with EnterpriseCatalogInclusionError before HTTP when enterpriseCustomerUuid is missing for non-empty candidates', async () => {
    await expect(filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: '',
      catalogUuids: ['catalog-1'],
      candidateCourseKeys: ['A'],
    })).rejects.toThrow(EnterpriseCatalogInclusionError);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects with EnterpriseCatalogInclusionError before HTTP when catalogUuids is empty for non-empty candidates', async () => {
    await expect(filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: [],
      candidateCourseKeys: ['A'],
    })).rejects.toThrow(EnterpriseCatalogInclusionError);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects with EnterpriseCatalogInclusionError before HTTP when catalogUuids normalizes to empty (all blank)', async () => {
    await expect(filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: ['  ', ''],
      candidateCourseKeys: ['A'],
    })).rejects.toThrow(EnterpriseCatalogInclusionError);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('preserves the original normalized Xpert candidate order, not the backend response order', async () => {
    mockFilteredContentResponse(['D', 'B', 'unknown']);

    const result = await filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: ['catalog-1'],
      candidateCourseKeys: ['A', 'B', 'C', 'D'],
    });

    expect(result).toEqual(['B', 'D']);
  });

  it('ignores duplicate and unrequested (unknown) backend keys', async () => {
    mockFilteredContentResponse(['A', 'A', 'unrequested-key', 'C']);

    const result = await filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: ['catalog-1'],
      candidateCourseKeys: ['A', 'B', 'C'],
    });

    expect(result).toEqual(['A', 'C']);
  });

  it('rejects with EnterpriseCatalogInclusionError when the response is not an array', async () => {
    mockPost.mockResolvedValue({ data: { filtered_content_keys: 'not-an-array' } });

    await expect(filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: ['catalog-1'],
      candidateCourseKeys: ['A'],
    })).rejects.toThrow(EnterpriseCatalogInclusionError);
  });

  it('rejects with EnterpriseCatalogInclusionError when the response array contains a non-string element', async () => {
    mockFilteredContentResponse(['A', 42]);

    await expect(filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: ['catalog-1'],
      candidateCourseKeys: ['A'],
    })).rejects.toThrow(EnterpriseCatalogInclusionError);
  });

  it('propagates a network/non-2xx rejection untouched, without fallback or retry', async () => {
    const networkError = new Error('Request failed with status code 500');
    mockPost.mockRejectedValue(networkError);

    await expect(filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: ['catalog-1'],
      candidateCourseKeys: ['A'],
    })).rejects.toThrow(networkError);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('calls the HTTP client exactly once for a valid non-empty input', async () => {
    mockFilteredContentResponse(['A']);

    await filterCourseKeysByEnterpriseCatalog({
      enterpriseCustomerUuid: 'enterprise-uuid-1',
      catalogUuids: ['catalog-1'],
      candidateCourseKeys: ['A'],
    });

    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
