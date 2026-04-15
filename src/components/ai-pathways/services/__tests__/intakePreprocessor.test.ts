import { intakePreprocessor } from '../intakePreprocessor';
import { CreateLearnerProfileArgs } from '../../types';

describe('intakePreprocessor', () => {
  describe('preprocessInput', () => {
    it('correctly cleans free text by removing fillers', () => {
      const args: CreateLearnerProfileArgs = {
        bringsYouHereRes: 'I want to learn software engineering',
        careerGoalRes: '',
        backgroundRes: '',
        industryRes: '',
        learningPrefRes: '',
        timeAvailableRes: '',
        certificateRes: '',
      };

      const result = intakePreprocessor.preprocessInput(args);
      expect(result.freeText).toBe('software engineering');
    });

    it('correctly cleans free text with other fillers', () => {
      const args: CreateLearnerProfileArgs = {
        bringsYouHereRes: 'Please show me data science',
        careerGoalRes: '',
        backgroundRes: '',
        industryRes: '',
        learningPrefRes: '',
        timeAvailableRes: '',
        certificateRes: '',
      };

      const result = intakePreprocessor.preprocessInput(args);
      expect(result.freeText).toBe('data science');
    });

    it('handles empty input in cleanText', () => {
       const args: CreateLearnerProfileArgs = {
        bringsYouHereRes: undefined as any,
        careerGoalRes: '',
        backgroundRes: '',
        industryRes: '',
        learningPrefRes: '',
        timeAvailableRes: '',
        certificateRes: '',
      };
      const result = intakePreprocessor.preprocessInput(args);
      expect(result.freeText).toBe('');
    });

    it('maps time availability correctly', () => {
      const testCases = [
        { input: 'up to 3 hours', expected: 'short' },
        { input: 'short duration', expected: 'short' },
        { input: '4-6 hours', expected: 'medium' },
        { input: 'medium duration', expected: 'medium' },
        { input: '7 or more hours', expected: 'long' },
        { input: 'long duration', expected: 'long' },
        { input: 'unknown', expected: 'unknown' },
      ];

      testCases.forEach(({ input, expected }) => {
        const args: CreateLearnerProfileArgs = {
          bringsYouHereRes: '',
          careerGoalRes: '',
          backgroundRes: '',
          industryRes: '',
          learningPrefRes: '',
          timeAvailableRes: input,
          certificateRes: '',
        };
        const result = intakePreprocessor.preprocessInput(args);
        expect(result.preferences).toContain(expected);
      });
    });

    it('filters out empty values from goals, context, and preferences', () => {
      const args: CreateLearnerProfileArgs = {
        bringsYouHereRes: 'test',
        careerGoalRes: 'goal',
        backgroundRes: '',
        industryRes: undefined as any,
        learningPrefRes: 'pref',
        timeAvailableRes: '',
        certificateRes: 'yes',
      };

      const result = intakePreprocessor.preprocessInput(args);
      expect(result.selectedGoals).toEqual(['goal']);
      expect(result.knownContext).toEqual([]);
      expect(result.preferences).toEqual(['pref', 'yes']);
    });
  });
});
