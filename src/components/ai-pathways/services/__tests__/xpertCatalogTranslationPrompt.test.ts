import { xpertCatalogTranslationPrompt } from '../xpertCatalogTranslationPrompt';
import { CatalogFacetSnapshot, XpertCatalogTranslationPayload } from '../../types';

describe('xpertCatalogTranslationPrompt', () => {
  const mockFacetSnapshot: CatalogFacetSnapshot = {
    skill_names: ['Python', 'SQL', 'Data Analysis'],
    'skills.name': ['Python', 'R'],
    subjects: ['Computer Science', 'Data Science'],
    level_type: ['Beginner', 'Intermediate'],
    'partners.name': ['edX', 'Coursera'],
    enterprise_catalog_query_uuids: ['cat-123'],
  };

  const mockPayload: XpertCatalogTranslationPayload = {
    careerTitle: 'Data Scientist',
    unmatchedSkills: ['Big Data', 'Machine Learning'],
    unmatchedIndustries: ['Technology'],
    unmatchedSimilarJobs: ['Data Engineer'],
    facetSnapshot: mockFacetSnapshot,
  };

  it('builds a system prompt containing strict rules and grounding instructions', () => {
    const { systemPrompt } = xpertCatalogTranslationPrompt.buildTranslationPrompt(mockPayload);

    expect(systemPrompt).toContain('career-to-catalog translation engine');
    expect(systemPrompt).toContain('ONLY use facet values that exist in the provided catalog facet snapshot');
    expect(systemPrompt).toContain('Return a strict JSON object only');
    expect(systemPrompt).toContain('Expected Output Shape');
    expect(systemPrompt).toContain('droppedTaxonomySkills');
    expect(systemPrompt).toContain('skillProvenance');
  });

  it('builds a user payload containing all necessary grounding context', () => {
    const { userPayload } = xpertCatalogTranslationPrompt.buildTranslationPrompt(mockPayload);

    expect(userPayload.careerTitle).toBe('Data Scientist');
    expect(userPayload.unmatchedSkills).toEqual(['Big Data', 'Machine Learning']);
    expect(userPayload.facetSnapshot).toEqual(mockFacetSnapshot);
  });
});
