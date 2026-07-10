import { mapAlgoliaHitToPathwayCourse, searchLearnerPathwaysCourses } from './catalogCourseSearch';

const mockSearch = jest.fn();
const mockIndex = { search: mockSearch } as unknown as Parameters<typeof searchLearnerPathwaysCourses>[0]['index'];

describe('searchLearnerPathwaysCourses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockResolvedValue({ hits: [] });
  });

  it('searches with the query, default hitsPerPage, page 0, and course/language facet filters', async () => {
    await searchLearnerPathwaysCourses({ index: mockIndex, query: 'Data Analyst' });

    expect(mockSearch).toHaveBeenCalledWith('Data Analyst', {
      hitsPerPage: 5,
      page: 0,
      facetFilters: [['content_type:course'], ['metadata_language:en']],
    });
  });

  it('respects an explicit hitsPerPage', async () => {
    await searchLearnerPathwaysCourses({ index: mockIndex, query: 'Data Analyst', hitsPerPage: 3 });

    expect(mockSearch).toHaveBeenCalledWith('Data Analyst', expect.objectContaining({ hitsPerPage: 3 }));
  });

  it('builds optionalFilters from optionalSkills, capped at 8', async () => {
    const skills = Array.from({ length: 10 }, (_, i) => `Skill${i}`);
    await searchLearnerPathwaysCourses({ index: mockIndex, query: 'Data Analyst', optionalSkills: skills });

    const callArgs = mockSearch.mock.calls[0][1];
    expect(callArgs.optionalFilters).toHaveLength(8);
    expect(callArgs.optionalFilters[0]).toBe('skill_names:"Skill0"');
  });

  it('omits optionalFilters when no optional skills are provided', async () => {
    await searchLearnerPathwaysCourses({ index: mockIndex, query: 'Data Analyst' });

    const callArgs = mockSearch.mock.calls[0][1];
    expect(callArgs).not.toHaveProperty('optionalFilters');
  });

  it('returns the raw hits array from the response', async () => {
    const hits = [{ objectID: '1', title: 'Course' }];
    mockSearch.mockResolvedValue({ hits });

    const result = await searchLearnerPathwaysCourses({ index: mockIndex, query: 'x' });

    expect(result).toBe(hits);
  });
});

describe('mapAlgoliaHitToPathwayCourse', () => {
  it('maps hit.key to courseKey with no objectID fallback', () => {
    const result = mapAlgoliaHitToPathwayCourse({
      objectID: 'obj-1',
      key: 'course-v1:edX+DataX+1T2026',
      title: 'Intro to Data Analysis',
    });

    expect(result.courseKey).toBe('course-v1:edX+DataX+1T2026');
  });

  it('leaves courseKey undefined when hit.key is absent, rather than substituting objectID', () => {
    const result = mapAlgoliaHitToPathwayCourse({ objectID: 'obj-2', title: 'Course With No Key' });

    expect(result.courseKey).toBeUndefined();
  });

  it('uses objectID as the local row id regardless of courseKey', () => {
    const result = mapAlgoliaHitToPathwayCourse({
      objectID: 'obj-3',
      key: 'course-v1:edX+DataX+1T2026',
      title: 'Course',
    });

    expect(result.id).toBe('obj-3');
  });

  it('maps title, provider, level, and defaults status to not_started', () => {
    const result = mapAlgoliaHitToPathwayCourse({
      objectID: 'obj-4',
      key: 'course-v1:edX+ExampleX+1T2026',
      title: 'Example Course',
      level_type: 'Introductory',
      partners: [{ name: 'edX' }],
    });

    expect(result).toEqual({
      id: 'obj-4',
      courseKey: 'course-v1:edX+ExampleX+1T2026',
      title: 'Example Course',
      provider: 'edX',
      level: 'Introductory',
      status: 'not_started',
    });
  });

  it('does not invent values for missing optional fields', () => {
    const result = mapAlgoliaHitToPathwayCourse({ objectID: 'obj-5', title: 'Course' });

    expect(result.provider).toBeUndefined();
    expect(result.level).toBeUndefined();
  });
});
