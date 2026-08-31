import { fetchCourseMetadataByKeys } from './courseMetadataByKey';
import { buildCourseCatalogScopeFilters } from './courseCatalogScopeFilters';
import type { CourseRetrievalCatalogScope } from '../types';

const stubCatalogScope: CourseRetrievalCatalogScope = {
  searchCatalogs: ['catalog-1'],
  catalogUuidsToCatalogQueryUuids: { 'catalog-1': 'query-1' },
};

const expectedFilters = buildCourseCatalogScopeFilters(stubCatalogScope);

const makeIndex = (search: jest.Mock) => ({ search } as unknown as Parameters<typeof fetchCourseMetadataByKeys>[0]['index']);

const hitFor = (key: string, overrides: Record<string, unknown> = {}) => ({
  key,
  title: `Title for ${key}`,
  objectID: `algolia-object-id-${key}`,
  ...overrides,
});

describe('fetchCourseMetadataByKeys', () => {
  it('returns [] and makes zero searches for an empty course-key list', async () => {
    const search = jest.fn();

    const result = await fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: [], catalogScope: stubCatalogScope,
    });

    expect(result).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it('trims, deduplicates, and queries keys in first-seen order', async () => {
    const search = jest.fn().mockResolvedValue({ hits: [] });

    await fetchCourseMetadataByKeys({
      index: makeIndex(search),
      courseKeys: [' A ', 'B', 'A', '  '],
      catalogScope: stubCatalogScope,
    });

    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[0][0]).toBe('A');
    expect(search.mock.calls[1][0]).toBe('B');
  });

  it('uses the course key as the search query text', async () => {
    const search = jest.fn().mockResolvedValue({ hits: [hitFor('A')] });

    await fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: ['A'], catalogScope: stubCatalogScope,
    });

    expect(search.mock.calls[0][0]).toBe('A');
  });

  it('includes the exact customer catalog-scope filter on every query', async () => {
    const search = jest.fn().mockResolvedValue({ hits: [hitFor('A')] });

    await fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: ['A'], catalogScope: stubCatalogScope,
    });

    expect(search.mock.calls[0][1]).toMatchObject({ filters: expectedFilters });
  });

  it('uses hitsPerPage: 10 on every query', async () => {
    const search = jest.fn().mockResolvedValue({ hits: [hitFor('A')] });

    await fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: ['A'], catalogScope: stubCatalogScope,
    });

    expect(search.mock.calls[0][1]).toMatchObject({ hitsPerPage: 10 });
  });

  it('selects the exact hit.key match when fuzzy/non-matching hits are also returned', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: [hitFor('A-advanced'), hitFor('A'), hitFor('A-intro')],
    });

    const result = await fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: ['A'], catalogScope: stubCatalogScope,
    });

    expect(result).toEqual([{ courseKey: 'A', title: 'Title for A', status: 'not_started' }]);
  });

  it('skips a key with no exact hit', async () => {
    const search = jest.fn().mockResolvedValue({ hits: [hitFor('A-different')] });

    const result = await fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: ['A'], catalogScope: stubCatalogScope,
    });

    expect(result).toEqual([]);
  });

  it('skips a record with a missing or blank title, even with an exact key match', async () => {
    const search = jest.fn().mockResolvedValue({ hits: [hitFor('A', { title: '  ' })] });

    const result = await fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: ['A'], catalogScope: stubCatalogScope,
    });

    expect(result).toEqual([]);
  });

  it('maps provider from partners[0].name and level from level_type when present', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: [hitFor('A', { partners: [{ name: 'edX' }, { name: 'Other' }], level_type: 'Intermediate' })],
    });

    const result = await fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: ['A'], catalogScope: stubCatalogScope,
    });

    expect(result).toEqual([{
      courseKey: 'A', title: 'Title for A', provider: 'edX', level: 'Intermediate', status: 'not_started',
    }]);
  });

  it('formats singular and plural week durations correctly', async () => {
    const search = jest.fn()
      .mockResolvedValueOnce({ hits: [hitFor('A', { advertised_course_run: { weeks_to_complete: 1 } })] })
      .mockResolvedValueOnce({ hits: [hitFor('B', { advertised_course_run: { weeks_to_complete: 8 } })] });

    const result = await fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: ['A', 'B'], catalogScope: stubCatalogScope,
    });

    expect(result[0].length).toBe('1 week');
    expect(result[1].length).toBe('8 weeks');
  });

  it('omits length when weeks_to_complete is missing, zero, negative, or non-numeric', async () => {
    const search = jest.fn()
      .mockResolvedValueOnce({ hits: [hitFor('A')] })
      .mockResolvedValueOnce({ hits: [hitFor('B', { advertised_course_run: { weeks_to_complete: 0 } })] })
      .mockResolvedValueOnce({ hits: [hitFor('C', { advertised_course_run: { weeks_to_complete: -3 } })] })
      .mockResolvedValueOnce({ hits: [hitFor('D', { advertised_course_run: { weeks_to_complete: 'eight' } })] });

    const result = await fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: ['A', 'B', 'C', 'D'], catalogScope: stubCatalogScope,
    });

    result.forEach((course) => {
      expect(course).not.toHaveProperty('length');
    });
  });

  it('preserves requested-key order even when searches resolve out of order', async () => {
    const search = jest.fn()
      .mockImplementationOnce(() => new Promise((resolve) => {
        setTimeout(() => resolve({ hits: [hitFor('A')] }), 10);
      }))
      .mockImplementationOnce(() => Promise.resolve({ hits: [hitFor('B')] }));

    const result = await fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: ['A', 'B'], catalogScope: stubCatalogScope,
    });

    expect(result.map((course) => course.courseKey)).toEqual(['A', 'B']);
  });

  it('propagates a search rejection without a partial-array fallback', async () => {
    const searchError = new Error('Algolia search failed');
    const search = jest.fn()
      .mockResolvedValueOnce({ hits: [hitFor('A')] })
      .mockRejectedValueOnce(searchError);

    await expect(fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: ['A', 'B'], catalogScope: stubCatalogScope,
    })).rejects.toThrow(searchError);
  });

  it('never leaks raw Algolia hit metadata onto the returned PathwayCourse', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: [hitFor('A', { _highlightResult: {}, objectID: 'algolia-object-id-A', someOtherField: 'noise' })],
    });

    const result = await fetchCourseMetadataByKeys({
      index: makeIndex(search), courseKeys: ['A'], catalogScope: stubCatalogScope,
    });

    expect(result).toEqual([{ courseKey: 'A', title: 'Title for A', status: 'not_started' }]);
  });
});
