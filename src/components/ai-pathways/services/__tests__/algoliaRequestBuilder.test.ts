import { buildAlgoliaRequest } from '../algoliaRequestBuilder';
import { SearchIntent } from '../../types';

describe('algoliaRequestBuilder', () => {
  const mockContext = {
    enterpriseCustomerUuid: 'test-uuid',
    catalogQueryUuids: ['catalog-1'],
    locale: 'en',
  };

  it('builds a bootstrap request with an empty query', () => {
    const result = buildAlgoliaRequest({
      mode: 'bootstrap',
      context: mockContext,
    });

    expect(result.query).toBe('');
    expect(result.metadata.mode).toBe('bootstrap');
    expect(result.requiredFilters.enterprise_customer_uuid).toEqual(['test-uuid']);
  });

  it('builds a refined request from roles', () => {
    const intent: SearchIntent = {
      condensedQuery: 'software engineering',
      roles: ['Software Engineer'],
      skillsRequired: ['React'],
      skillsPreferred: [],
      learnerLevel: 'beginner',
      queryTerms: ['something random'],
      excludeTags: [],
      timeCommitment: 'medium',
    };

    const result = buildAlgoliaRequest({
      intent,
      mode: 'assembly',
      context: mockContext,
    });

    expect(result.query).toBe('software engineer');
    expect(result.requiredFilters['skills.name']).toEqual(['React']);
    expect(result.optionalFilters?.name).toEqual(['Software Engineer']);
  });

  it('uses queryTerms when roles are empty', () => {
    const intent: SearchIntent = {
      condensedQuery: 'machine learning',
      roles: [],
      skillsRequired: [],
      skillsPreferred: [],
      learnerLevel: 'beginner',
      queryTerms: ['Machine Learning'],
      excludeTags: [],
      timeCommitment: 'medium',
    };

    const result = buildAlgoliaRequest({
      intent,
      mode: 'assembly',
      context: mockContext,
    });

    expect(result.query).toBe('machine learning');
  });

  it('applies a fallback query when both roles and queryTerms are missing', () => {
    const intent: SearchIntent = {
      condensedQuery: 'career opportunities',
      roles: [],
      skillsRequired: [],
      skillsPreferred: [],
      learnerLevel: 'beginner',
      queryTerms: [],
      excludeTags: [],
      timeCommitment: 'medium',
    };

    const result = buildAlgoliaRequest({
      intent,
      mode: 'assembly',
      context: mockContext,
    });

    expect(result.query).toBe('career opportunities');
  });

  it('handles excluded tags correctly', () => {
    const intent: SearchIntent = {
      condensedQuery: 'design career',
      roles: ['Designer'],
      skillsRequired: [],
      skillsPreferred: [],
      learnerLevel: 'beginner',
      queryTerms: [],
      excludeTags: ['Finance'],
      timeCommitment: 'medium',
    };

    const result = buildAlgoliaRequest({
      intent,
      mode: 'assembly',
      context: mockContext,
    });

    expect(result.excludedFilters?.industry_names).toEqual(['Finance']);
  });
});
