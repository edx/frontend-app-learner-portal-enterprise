import {
  XpertIntent, LearnerLevel, TimeCommitment,
} from '../types';

export const DEFAULT_INTENT: XpertIntent = {
  condensedQuery: 'career development',
  roles: [],
  skillsRequired: [],
  skillsPreferred: [],
  industries: [],
  jobSources: [],
  learnerLevel: 'beginner',
  timeCommitment: 'medium',
  excludeTags: [],
};

export interface ReasoningResponse {
  reasonings: Array<{
    id: string;
    reasoning: string;
  }>;
}

export const xpertContractService = {
  /**
   * Parses, validates, and normalizes Xpert response into XpertIntent.
   *
   * @param rawResponse Raw string from Xpert assistant message.
   * @returns Validated XpertIntent or null if parsing fails entirely.
   */
  parseIntent(rawResponse: string): XpertIntent | null {
    try {
      // Handle potential markdown fences if Xpert ignores instructions
      const jsonString = rawResponse.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
      const parsed = JSON.parse(jsonString);
      return this.normalizeIntent(parsed);
    } catch {
      return null;
    }
  },

  /**
   * Normalizes a raw object into a strict XpertIntent.
   * Coerces unknown enum values to defaults and ensures all arrays exist.
   */
  normalizeIntent(raw: any): XpertIntent {
    const normalizeLevel = (level: any): LearnerLevel => {
      const valid: LearnerLevel[] = ['beginner', 'intermediate', 'advanced'];
      return valid.includes(level) ? level : 'beginner';
    };

    const normalizeCommitment = (commitment: any): TimeCommitment => {
      const valid: TimeCommitment[] = ['short', 'medium', 'long'];
      return valid.includes(commitment) ? commitment : 'medium';
    };

    const ensureArray = (val: any): string[] => (Array.isArray(val) ? val.filter(v => typeof v === 'string') : []);

    return {
      condensedQuery: (typeof raw.condensedQuery === 'string' && raw.condensedQuery.trim())
        ? raw.condensedQuery
        : DEFAULT_INTENT.condensedQuery,
      roles: ensureArray(raw.roles),
      skillsRequired: ensureArray(raw.skillsRequired),
      skillsPreferred: ensureArray(raw.skillsPreferred),
      industries: ensureArray(raw.industries),
      jobSources: ensureArray(raw.jobSources),
      learnerLevel: normalizeLevel(raw.learnerLevel),
      timeCommitment: normalizeCommitment(raw.timeCommitment),
      excludeTags: ensureArray(raw.excludeTags),
    };
  },

  /**
   * Validates if the intent meets critical quality rules.
   */
  validateIntent(intent: XpertIntent): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!intent.condensedQuery || intent.condensedQuery === DEFAULT_INTENT.condensedQuery) {
      if (!intent.condensedQuery || intent.condensedQuery.trim() === '') {
        errors.push('condensedQuery is empty');
      }
    }

    if (intent.roles.length === 0 && intent.skillsRequired.length === 0) {
      errors.push('Neither roles nor skillsRequired are present');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Parses and normalizes the reasoning response.
   */
  parseReasoning(rawResponse: string): ReasoningResponse | null {
    try {
      const jsonString = rawResponse.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
      const parsed = JSON.parse(jsonString);

      if (!parsed.reasonings || !Array.isArray(parsed.reasonings)) {
        return null;
      }

      return {
        reasonings: parsed.reasonings.map((r: any) => ({
          id: String(r.id || ''),
          reasoning: String(r.reasoning || ''),
        })),
      };
    } catch {
      return null;
    }
  },
};
