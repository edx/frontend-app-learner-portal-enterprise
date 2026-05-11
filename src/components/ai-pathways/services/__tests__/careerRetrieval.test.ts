import { SearchIndex } from 'algoliasearch/lite';
import { careerRetrievalService } from '../careerRetrieval';
import { DEFAULT_INTENT } from '../../constants';

describe('careerRetrievalService', () => {
  const mockIndex = {
    search: jest.fn(),
  } as unknown as SearchIndex;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds correct Algolia query from intent', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({
      hits: [
        {
          id: '1',
          name: 'Software Engineer',
          description: 'Build things',
          skills: [{ name: 'React' }],
          industry_names: ['Tech'],
        },
      ],
    });

    const intent = {
      ...DEFAULT_INTENT,
      condensedQuery: 'engineer',
      industries: ['Tech'],
      skillsRequired: ['React'],
    };

    const result = await careerRetrievalService.searchCareers(mockIndex, intent);

    expect(mockIndex.search).toHaveBeenCalledWith('engineer', expect.objectContaining({
      filters: expect.stringContaining('industry_names:"Tech"'),
      optionalFilters: expect.arrayContaining(['skills.name:"React"']),
    }));

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Software Engineer');
    expect(result[0].skills).toEqual(['React']);
  });

  it('handles excludeTags in filters', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });

    const intent = {
      ...DEFAULT_INTENT,
      excludeTags: ['PHP', 'Ruby'],
    };

    await careerRetrievalService.searchCareers(mockIndex, intent);

    expect(mockIndex.search).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      filters: expect.stringContaining('NOT skills.name:"PHP"'),
    }));
    expect(mockIndex.search).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      filters: expect.stringContaining('NOT skills.name:"Ruby"'),
    }));
  });

  it('caps required skills at CAREER_REQUIRED_OPTIONAL_FILTER_LIMIT (4)', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });

    const intent = {
      ...DEFAULT_INTENT,
      skillsRequired: ['SkillA', 'SkillB', 'SkillC', 'SkillD', 'SkillE', 'SkillF'],
    };

    await careerRetrievalService.searchCareers(mockIndex, intent);

    const callArgs = (mockIndex.search as jest.Mock).mock.calls[0][1];
    expect(callArgs.optionalFilters).toHaveLength(4);
  });

  it('excludes preferred skills when learnerLevel is beginner', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });

    const intent = {
      ...DEFAULT_INTENT,
      learnerLevel: 'beginner' as const,
      skillsRequired: ['Cloud Computing'],
      skillsPreferred: ['AWS', 'Kubernetes'],
    };

    await careerRetrievalService.searchCareers(mockIndex, intent);

    const callArgs = (mockIndex.search as jest.Mock).mock.calls[0][1];
    const filters: string[] = callArgs.optionalFilters || [];
    expect(filters.some((f) => f.includes('AWS'))).toBe(false);
    expect(filters.some((f) => f.includes('Kubernetes'))).toBe(false);
    expect(filters.some((f) => f.includes('Cloud Computing'))).toBe(true);
  });

  it('includes preferred skills (capped to 2) when learnerLevel is intermediate', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });

    const intent = {
      ...DEFAULT_INTENT,
      learnerLevel: 'intermediate' as const,
      skillsRequired: ['Cloud Computing'],
      skillsPreferred: ['AWS', 'Kubernetes', 'Terraform'],
    };

    await careerRetrievalService.searchCareers(mockIndex, intent);

    const callArgs = (mockIndex.search as jest.Mock).mock.calls[0][1];
    const filters: string[] = callArgs.optionalFilters || [];
    // 1 required + 2 preferred (capped) = 3 total
    expect(filters).toHaveLength(3);
  });

  it('filters out malformed compound strings from optionalFilters', async () => {
    (mockIndex.search as jest.Mock).mockResolvedValueOnce({ hits: [] });

    const intent = {
      ...DEFAULT_INTENT,
      skillsRequired: ['AutomationSQL & Python', 'Cloud Computing'],
    };

    await careerRetrievalService.searchCareers(mockIndex, intent);

    const callArgs = (mockIndex.search as jest.Mock).mock.calls[0][1];
    const filters: string[] = callArgs.optionalFilters || [];
    expect(filters.some((f) => f.includes('AutomationSQL'))).toBe(false);
    expect(filters.some((f) => f.includes('Cloud Computing'))).toBe(true);
  });
});
