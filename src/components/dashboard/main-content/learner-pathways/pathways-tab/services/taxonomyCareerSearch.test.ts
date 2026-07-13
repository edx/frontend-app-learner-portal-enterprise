import { mapTaxonomyHitToCareerMatch, searchTaxonomyCareers } from './taxonomyCareerSearch';

const mockSearch = jest.fn();
const mockIndex = { search: mockSearch } as unknown as Parameters<typeof searchTaxonomyCareers>[0]['index'];

describe('searchTaxonomyCareers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockResolvedValue({ hits: [] });
  });

  it('searches the given index with the query and default hitsPerPage', async () => {
    await searchTaxonomyCareers({ index: mockIndex, query: 'Data Analysis' });

    expect(mockSearch).toHaveBeenCalledWith('Data Analysis', { hitsPerPage: 10 });
  });

  it('respects an explicit hitsPerPage', async () => {
    await searchTaxonomyCareers({ index: mockIndex, query: 'Data Analysis', hitsPerPage: 3 });

    expect(mockSearch).toHaveBeenCalledWith('Data Analysis', { hitsPerPage: 3 });
  });

  it('builds optionalFilters from skillsRequired and skillsPreferred combined', async () => {
    await searchTaxonomyCareers({
      index: mockIndex,
      query: 'Data Analysis',
      skillsRequired: ['SQL'],
      skillsPreferred: ['Python'],
    });

    expect(mockSearch).toHaveBeenCalledWith('Data Analysis', {
      hitsPerPage: 10,
      optionalFilters: ['skills.name:"SQL"', 'skills.name:"Python"'],
    });
  });

  it('omits optionalFilters entirely when no skills are provided', async () => {
    await searchTaxonomyCareers({ index: mockIndex, query: 'Data Analysis' });

    const callArgs = mockSearch.mock.calls[0][1];
    expect(callArgs).not.toHaveProperty('optionalFilters');
  });

  it('returns the raw hits array from the response', async () => {
    const hits = [{ objectID: '1', name: 'Data Analyst' }];
    mockSearch.mockResolvedValue({ hits });

    const result = await searchTaxonomyCareers({ index: mockIndex, query: 'x' });

    expect(result).toBe(hits);
  });
});

describe('mapTaxonomyHitToCareerMatch', () => {
  it('maps id, title, and skillsToDevelop from known taxonomy fields', () => {
    const result = mapTaxonomyHitToCareerMatch({
      objectID: 'obj-1',
      id: 'career-123',
      name: 'Data Analyst',
      skills: [{ name: 'SQL' }, { name: 'Python' }],
    });

    expect(result).toEqual({
      id: 'career-123',
      title: 'Data Analyst',
      skillsToDevelop: ['SQL', 'Python'],
    });
  });

  it('falls back to objectID when id is absent', () => {
    const result = mapTaxonomyHitToCareerMatch({ objectID: 'obj-2', name: 'Data Analyst' });

    expect(result.id).toBe('obj-2');
  });

  it('does not fabricate matchPercentage or laborMarketTrend', () => {
    const result = mapTaxonomyHitToCareerMatch({ objectID: 'obj-3', name: 'Data Analyst' });

    expect(result.matchPercentage).toBeUndefined();
    expect(result.laborMarketTrend).toBeUndefined();
  });

  it('filters out skills with no name and defaults skillsToDevelop to an empty array when absent', () => {
    const result = mapTaxonomyHitToCareerMatch({
      objectID: 'obj-4',
      name: 'Data Analyst',
      skills: [{ name: 'SQL' }, {}],
    });

    expect(result.skillsToDevelop).toEqual(['SQL']);

    const resultNoSkills = mapTaxonomyHitToCareerMatch({ objectID: 'obj-5', name: 'Data Analyst' });
    expect(resultNoSkills.skillsToDevelop).toEqual([]);
  });
});
