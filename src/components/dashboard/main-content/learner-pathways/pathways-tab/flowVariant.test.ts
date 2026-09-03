import { hasPathwaysFlowConflict, parsePathwaysFlowVariant } from './flowVariant';

describe('parsePathwaysFlowVariant', () => {
  it('returns "skills" when the query string is empty', () => {
    expect(parsePathwaysFlowVariant('')).toBe('skills');
  });

  it('returns "skills" when the param is missing entirely', () => {
    expect(parsePathwaysFlowVariant('utm_source=foo')).toBe('skills');
  });

  it('returns "career" for ?pathwayMode=career', () => {
    expect(parsePathwaysFlowVariant('pathwayMode=career')).toBe('career');
  });

  it('returns "skills" for ?pathwayMode=skills', () => {
    expect(parsePathwaysFlowVariant('pathwayMode=skills')).toBe('skills');
  });

  it('returns "skills" for any other value', () => {
    expect(parsePathwaysFlowVariant('pathwayMode=bogus')).toBe('skills');
  });

  it('returns "skills" for an empty value', () => {
    expect(parsePathwaysFlowVariant('pathwayMode=')).toBe('skills');
  });

  it('treats the key as case-sensitive: PathwayMode=career does not match', () => {
    expect(parsePathwaysFlowVariant('PathwayMode=career')).toBe('skills');
  });

  it('uses the first occurrence when the param is duplicated, career first', () => {
    expect(parsePathwaysFlowVariant('pathwayMode=career&pathwayMode=skills')).toBe('career');
  });

  it('uses the first occurrence when the param is duplicated, skills first', () => {
    expect(parsePathwaysFlowVariant('pathwayMode=skills&pathwayMode=career')).toBe('skills');
  });

  it('accepts a URLSearchParams instance identically to an equivalent raw string', () => {
    expect(parsePathwaysFlowVariant(new URLSearchParams('pathwayMode=career')))
      .toBe(parsePathwaysFlowVariant('pathwayMode=career'));
  });
});

describe('hasPathwaysFlowConflict', () => {
  it('is a conflict when a "pathway" section was built by career mode but the active variant is skills', () => {
    expect(hasPathwaysFlowConflict({ section: 'pathway', pathwayGenerationMode: 'career', flowVariant: 'skills' })).toBe(true);
  });

  it('is a conflict when a "pathway" section was built by skills mode but the active variant is career', () => {
    expect(hasPathwaysFlowConflict({ section: 'pathway', pathwayGenerationMode: 'skills', flowVariant: 'career' })).toBe(true);
  });

  it('is not a conflict when the persisted mode matches the active variant', () => {
    expect(hasPathwaysFlowConflict({ section: 'pathway', pathwayGenerationMode: 'career', flowVariant: 'career' })).toBe(false);
    expect(hasPathwaysFlowConflict({ section: 'pathway', pathwayGenerationMode: 'skills', flowVariant: 'skills' })).toBe(false);
  });

  it('is not a conflict on "pathway" when pathwayGenerationMode is null (legacy pathway with no recorded mode)', () => {
    expect(hasPathwaysFlowConflict({ section: 'pathway', pathwayGenerationMode: null, flowVariant: 'career' })).toBe(false);
    expect(hasPathwaysFlowConflict({ section: 'pathway', pathwayGenerationMode: null, flowVariant: 'skills' })).toBe(false);
  });

  it('is a conflict on "profile" whenever the active variant is skills, regardless of mode', () => {
    expect(hasPathwaysFlowConflict({ section: 'profile', pathwayGenerationMode: null, flowVariant: 'skills' })).toBe(true);
    expect(hasPathwaysFlowConflict({ section: 'profile', pathwayGenerationMode: 'career', flowVariant: 'skills' })).toBe(true);
    expect(hasPathwaysFlowConflict({ section: 'profile', pathwayGenerationMode: 'skills', flowVariant: 'skills' })).toBe(true);
  });

  it('is never a conflict on "profile" when the active variant is career', () => {
    expect(hasPathwaysFlowConflict({ section: 'profile', pathwayGenerationMode: null, flowVariant: 'career' })).toBe(false);
    expect(hasPathwaysFlowConflict({ section: 'profile', pathwayGenerationMode: 'career', flowVariant: 'career' })).toBe(false);
  });

  it('is never a conflict on "onboarding", for any mode/variant combination', () => {
    expect(hasPathwaysFlowConflict({ section: 'onboarding', pathwayGenerationMode: null, flowVariant: 'career' })).toBe(false);
    expect(hasPathwaysFlowConflict({ section: 'onboarding', pathwayGenerationMode: null, flowVariant: 'skills' })).toBe(false);
    expect(hasPathwaysFlowConflict({ section: 'onboarding', pathwayGenerationMode: 'career', flowVariant: 'skills' })).toBe(false);
    expect(hasPathwaysFlowConflict({ section: 'onboarding', pathwayGenerationMode: 'skills', flowVariant: 'career' })).toBe(false);
  });
});
