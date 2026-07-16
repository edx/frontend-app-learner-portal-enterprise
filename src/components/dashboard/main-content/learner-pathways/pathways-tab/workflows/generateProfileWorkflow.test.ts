import { fetchLearningIntent } from '../../../../../app/data/services/xpert';
import { careerRetrievalService, getCareerAlgoliaIndex } from '../services';
import { generateProfileWorkflow } from './generateProfileWorkflow';
import type { GenerateProfileWorkflowInput } from './types';

jest.mock('../../../../../app/data/services/xpert', () => ({ fetchLearningIntent: jest.fn() }));
jest.mock('../services', () => ({
  careerRetrievalService: { searchCareers: jest.fn() },
  getCareerAlgoliaIndex: jest.fn(),
}));

const mockFetchLearningIntent = fetchLearningIntent as jest.Mock;
const mockSearchCareers = careerRetrievalService.searchCareers as jest.Mock;
const mockGetCareerAlgoliaIndex = getCareerAlgoliaIndex as jest.Mock;

const learnerIntent: GenerateProfileWorkflowInput = {
  careerGoal: 'Become a data analyst',
  targetIndustry: 'Technology',
  background: 'Customer support, 3 years',
  motivation: 'Career growth',
};

const sentinelIndex = { search: jest.fn() };

const sampleCareerMatches = [
  { id: '1', title: 'Data Analyst', skillsToDevelop: ['SQL'] },
  { id: '2', title: 'Business Analyst' },
];

describe('generateProfileWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCareerAlgoliaIndex.mockReturnValue(sentinelIndex);
  });

  describe('successful orchestration and ordering', () => {
    it('calls fetchLearningIntent once with the exact canonical input, today\'s real 3-field response shape', async () => {
      mockFetchLearningIntent.mockResolvedValueOnce({
        condensedAlgoliaQuery: 'data analysis',
        skillsRequired: ['SQL'],
        skillsPreferred: ['Excel'],
      });
      mockSearchCareers.mockResolvedValueOnce(sampleCareerMatches);

      await generateProfileWorkflow(learnerIntent);

      expect(mockFetchLearningIntent).toHaveBeenCalledTimes(1);
      expect(mockFetchLearningIntent).toHaveBeenCalledWith(learnerIntent);
    });

    it('resolves the configured career index only after Learning Intent succeeds, then calls searchCareers once with it and the exact normalized response', async () => {
      const searchIntent = {
        condensedAlgoliaQuery: 'data analysis',
        skillsRequired: ['SQL'],
        skillsPreferred: ['Excel'],
      };
      mockFetchLearningIntent.mockResolvedValueOnce(searchIntent);
      mockSearchCareers.mockResolvedValueOnce(sampleCareerMatches);

      await generateProfileWorkflow(learnerIntent);

      expect(mockGetCareerAlgoliaIndex).toHaveBeenCalledTimes(1);
      expect(mockSearchCareers).toHaveBeenCalledTimes(1);
      expect(mockSearchCareers).toHaveBeenCalledWith(sentinelIndex, searchIntent);

      const intentCallOrder = mockFetchLearningIntent.mock.invocationCallOrder[0];
      const indexCallOrder = mockGetCareerAlgoliaIndex.mock.invocationCallOrder[0];
      const searchCallOrder = mockSearchCareers.mock.invocationCallOrder[0];
      expect(intentCallOrder).toBeLessThan(indexCallOrder);
      expect(indexCallOrder).toBeLessThan(searchCallOrder);
    });

    it('does not call getCareerAlgoliaIndex or searchCareers until fetchLearningIntent actually resolves (strict async sequencing)', async () => {
      let resolveLearningIntent: (value: unknown) => void = () => {};
      mockFetchLearningIntent.mockReturnValueOnce(new Promise((resolve) => {
        resolveLearningIntent = resolve;
      }));
      mockSearchCareers.mockResolvedValueOnce([]);

      const promise = generateProfileWorkflow(learnerIntent);

      expect(mockGetCareerAlgoliaIndex).not.toHaveBeenCalled();
      expect(mockSearchCareers).not.toHaveBeenCalled();

      resolveLearningIntent({
        condensedAlgoliaQuery: 'data analysis', skillsRequired: ['SQL'], skillsPreferred: [],
      });
      await promise;

      expect(mockGetCareerAlgoliaIndex).toHaveBeenCalledTimes(1);
      expect(mockSearchCareers).toHaveBeenCalledTimes(1);
    });

    it('also works with the full 9-field extended shape, once the backend supplies it', async () => {
      const fullSearchIntent = {
        condensedAlgoliaQuery: 'data analysis',
        skillsRequired: ['SQL'],
        skillsPreferred: ['Excel'],
        roles: ['Data Analyst'],
        industries: ['Technology'],
        jobSources: ['LinkedIn'],
        learnerLevel: 'intermediate' as const,
        timeCommitment: 'medium' as const,
        excludeTags: ['PHP'],
      };
      mockFetchLearningIntent.mockResolvedValueOnce(fullSearchIntent);
      mockSearchCareers.mockResolvedValueOnce(sampleCareerMatches);

      const result = await generateProfileWorkflow(learnerIntent);

      expect(mockSearchCareers).toHaveBeenCalledWith(sentinelIndex, fullSearchIntent);
      expect(result.careerMatches).toBe(sampleCareerMatches);
    });

    it('returns the mapped LearnerProfile and the exact CareerMatch[] from Career Retrieval, preserving order', async () => {
      mockFetchLearningIntent.mockResolvedValueOnce({
        condensedAlgoliaQuery: 'data analysis',
        skillsRequired: ['SQL'],
        skillsPreferred: ['Excel'],
      });
      mockSearchCareers.mockResolvedValueOnce(sampleCareerMatches);

      const result = await generateProfileWorkflow(learnerIntent);

      expect(result.careerMatches).toEqual(sampleCareerMatches);
      expect(result.careerMatches).toBe(sampleCareerMatches);
      expect(result.learnerProfile.summary).toBe('Found 2 career matches for your goals.');
    });
  });

  describe('result mapping', () => {
    it('normalizes and deduplicates skills, required-first then preferred, trimming whitespace and blanks', async () => {
      mockFetchLearningIntent.mockResolvedValueOnce({
        condensedAlgoliaQuery: 'data analysis',
        skillsRequired: ['SQL', ' SQL ', 'Python'],
        skillsPreferred: ['Excel', 'Python', '  ', ''],
      });
      mockSearchCareers.mockResolvedValueOnce(sampleCareerMatches);

      const result = await generateProfileWorkflow(learnerIntent);

      expect(result.learnerProfile.skills).toEqual(['SQL', 'Python', 'Excel']);
    });

    it('uses singular grammar for exactly one career match', async () => {
      mockFetchLearningIntent.mockResolvedValueOnce({
        condensedAlgoliaQuery: 'data analysis', skillsRequired: ['SQL'], skillsPreferred: [],
      });
      mockSearchCareers.mockResolvedValueOnce([sampleCareerMatches[0]]);

      const result = await generateProfileWorkflow(learnerIntent);

      expect(result.learnerProfile.summary).toBe('Found 1 career match for your goals.');
    });

    it('leaves learningStyle, weeklyTimeCommitment, and certificatePreference empty rather than fabricated', async () => {
      mockFetchLearningIntent.mockResolvedValueOnce({
        condensedAlgoliaQuery: 'data analysis',
        skillsRequired: ['SQL'],
        skillsPreferred: [],
        learnerLevel: 'introductory',
        timeCommitment: 'short',
      });
      mockSearchCareers.mockResolvedValueOnce(sampleCareerMatches);

      const result = await generateProfileWorkflow(learnerIntent);

      expect(result.learnerProfile.learningStyle).toBe('');
      expect(result.learnerProfile.weeklyTimeCommitment).toBe('');
      expect(result.learnerProfile.certificatePreference).toBe('');
    });

    it('never copies canonical LearnerIntent fields onto the mapped LearnerProfile', async () => {
      mockFetchLearningIntent.mockResolvedValueOnce({
        condensedAlgoliaQuery: 'data analysis', skillsRequired: ['SQL'], skillsPreferred: [],
      });
      mockSearchCareers.mockResolvedValueOnce(sampleCareerMatches);

      const result = await generateProfileWorkflow(learnerIntent);

      expect(result.learnerProfile).not.toHaveProperty('careerGoal');
      expect(result.learnerProfile).not.toHaveProperty('targetIndustry');
      expect(result.learnerProfile).not.toHaveProperty('background');
      expect(result.learnerProfile).not.toHaveProperty('motivation');
    });

    it('does not mutate the input LearnerIntent', async () => {
      const inputCopy = { ...learnerIntent };
      mockFetchLearningIntent.mockResolvedValueOnce({
        condensedAlgoliaQuery: 'data analysis', skillsRequired: ['SQL'], skillsPreferred: [],
      });
      mockSearchCareers.mockResolvedValueOnce(sampleCareerMatches);

      await generateProfileWorkflow(learnerIntent);

      expect(learnerIntent).toEqual(inputCopy);
    });
  });

  describe('empty career results', () => {
    it('resolves successfully with an empty careerMatches array and the no-match summary, not a rejection or fixture substitution', async () => {
      mockFetchLearningIntent.mockResolvedValueOnce({
        condensedAlgoliaQuery: 'data analysis', skillsRequired: ['SQL'], skillsPreferred: [],
      });
      mockSearchCareers.mockResolvedValueOnce([]);

      const result = await generateProfileWorkflow(learnerIntent);

      expect(result.careerMatches).toEqual([]);
      expect(result.learnerProfile.summary).toBe('No career matches were found for your current goal.');
      expect(mockSearchCareers).toHaveBeenCalledTimes(1);
    });
  });

  describe('failure behavior', () => {
    it('propagates a Learning Intent rejection and never resolves the career index or calls Career Retrieval', async () => {
      const learningIntentError = new Error('Learning Intent service unavailable');
      mockFetchLearningIntent.mockRejectedValueOnce(learningIntentError);

      await expect(generateProfileWorkflow(learnerIntent)).rejects.toThrow(learningIntentError);

      expect(mockGetCareerAlgoliaIndex).not.toHaveBeenCalled();
      expect(mockSearchCareers).not.toHaveBeenCalled();
      expect(mockFetchLearningIntent).toHaveBeenCalledTimes(1);
    });

    it('propagates a Career Retrieval rejection without retrying Learning Intent or returning a partial result', async () => {
      mockFetchLearningIntent.mockResolvedValueOnce({
        condensedAlgoliaQuery: 'data analysis', skillsRequired: ['SQL'], skillsPreferred: [],
      });
      const searchError = new Error('Algolia service unavailable');
      mockSearchCareers.mockRejectedValueOnce(searchError);

      await expect(generateProfileWorkflow(learnerIntent)).rejects.toThrow(searchError);

      expect(mockFetchLearningIntent).toHaveBeenCalledTimes(1);
      expect(mockSearchCareers).toHaveBeenCalledTimes(1);
    });
  });
});
