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
    const { bundle } = xpertCatalogTranslationPrompt.buildTranslationPrompt(mockPayload);
    const systemPrompt = bundle.combined;

    expect(systemPrompt).toContain('career-to-catalog translation engine');
    expect(systemPrompt).toContain('ONLY use values present in "facetSnapshot".');
    expect(systemPrompt).toContain('Return strict JSON only');
    expect(systemPrompt).toContain('Expected Output Shape');
    expect(systemPrompt).toContain('droppedTaxonomySkills');
    expect(systemPrompt).toContain('skillProvenance');
  });

  it('exposes prompt parts with correct labels and editability', () => {
    const { bundle } = xpertCatalogTranslationPrompt.buildTranslationPrompt(mockPayload);

    expect(bundle.stage).toBe('catalogTranslation');
    expect(bundle.parts).toHaveLength(2);
    expect(bundle.parts[0].label).toBe('base');
    expect(bundle.parts[0].required).toBe(true);
    expect(bundle.parts[1].label).toBe('schema');
    expect(bundle.parts[1].editable).toBe(false);
    expect(bundle.parts[1].required).toBe(true);
  });

  it('combined string equals concatenation of all parts', () => {
    const { bundle } = xpertCatalogTranslationPrompt.buildTranslationPrompt(mockPayload);
    const fromParts = bundle.parts.map(p => p.content).join('');

    expect(bundle.combined).toBe(fromParts);
  });

  it('builds a user payload containing all necessary grounding context', () => {
    const { userPayload } = xpertCatalogTranslationPrompt.buildTranslationPrompt(mockPayload);

    expect(userPayload.careerTitle).toBe('Data Scientist');
    expect(userPayload.unmatchedSkills).toEqual(['Big Data', 'Machine Learning']);
    expect(userPayload.facetSnapshot).toEqual(mockFacetSnapshot);
  });
});
