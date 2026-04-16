import { xpertContractService } from '../xpertContract';
import { DEFAULT_INTENT } from '../../constants';

describe('xpertContractService coverage gaps', () => {
  describe('parseIntent', () => {
    it('strips markdown fences correctly', () => {
      const raw = '```json\n{"condensedQuery": "test"}\n```';
      const result = xpertContractService.parseIntent(raw);
      expect(result?.condensedQuery).toBe('test');
    });

    it('returns null on invalid JSON', () => {
      expect(xpertContractService.parseIntent('invalid')).toBeNull();
    });
  });

  describe('normalizeIntent', () => {
    it('handles non-string elements in arrays', () => {
      const raw = {
        roles: ['Dev', 123, null],
        skillsRequired: ['JS', {}],
      };
      const result = xpertContractService.normalizeIntent(raw);
      expect(result.roles).toEqual(['Dev']);
      expect(result.skillsRequired).toEqual(['JS']);
    });

    it('falls back to default learnerLevel and timeCommitment if invalid', () => {
      const raw = {
        learnerLevel: 'god-mode',
        timeCommitment: 'forever',
      };
      const result = xpertContractService.normalizeIntent(raw);
      expect(result.learnerLevel).toBe(DEFAULT_INTENT.learnerLevel);
      expect(result.timeCommitment).toBe(DEFAULT_INTENT.timeCommitment);
    });
  });

  describe('validateIntent', () => {
    it('fails if condensedQuery is the default value', () => {
      const intent = {
        ...DEFAULT_INTENT,
        roles: ['Dev'],
      };
      // DEFAULT_INTENT.condensedQuery is usually '' or some placeholder.
      // If it's precisely the default, it might fail depending on implementation.
      const result = xpertContractService.validateIntent(intent);
      // Based on code: if (intent.condensedQuery === DEFAULT_INTENT.condensedQuery) { ... }
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('condensedQuery is empty');
    });

    it('fails if both roles and skillsRequired are empty', () => {
      const intent = {
        ...DEFAULT_INTENT,
        condensedQuery: 'some query',
        roles: [],
        skillsRequired: [],
      };
      const result = xpertContractService.validateIntent(intent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Neither roles nor skillsRequired are present');
    });
  });

  describe('parseReasoning', () => {
    it('returns null if reasonings field is missing or not an array', () => {
      expect(xpertContractService.parseReasoning('{}')).toBeNull();
      expect(xpertContractService.parseReasoning('{"reasonings": "not array"}')).toBeNull();
    });

    it('handles missing id or reasoning in entries', () => {
      const raw = JSON.stringify({
        reasonings: [
          { id: 'c1' }, // missing reasoning
          { reasoning: 'why' }, // missing id
        ],
      });
      const result = xpertContractService.parseReasoning(raw);
      expect(result?.reasonings[0].reasoning).toBe('');
      expect(result?.reasonings[1].id).toBe('');
    });

    it('returns null on catch block (invalid JSON)', () => {
      expect(xpertContractService.parseReasoning('!!!')).toBeNull();
    });
  });
});
