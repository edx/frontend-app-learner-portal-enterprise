import { hasPathwaysFlowConflict, parsePathwaysFlowVariant } from './flowVariant';

describe('parsePathwaysFlowVariant', () => {
  it('returns "career" when the query string is empty', () => {
    expect(parsePathwaysFlowVariant('')).toBe('career');
  });

  it('returns "career" when the param is missing entirely', () => {
    expect(parsePathwaysFlowVariant('utm_source=foo')).toBe('career');
  });

  it('returns "direct" for ?pathwaysFlow=direct', () => {
    expect(parsePathwaysFlowVariant('pathwaysFlow=direct')).toBe('direct');
  });

  it('returns "career" for ?pathwaysFlow=career', () => {
    expect(parsePathwaysFlowVariant('pathwaysFlow=career')).toBe('career');
  });

  it('returns "career" for any other value', () => {
    expect(parsePathwaysFlowVariant('pathwaysFlow=bogus')).toBe('career');
  });

  it('returns "career" for an empty value', () => {
    expect(parsePathwaysFlowVariant('pathwaysFlow=')).toBe('career');
  });

  it('treats the key as case-sensitive: PathwaysFlow=direct does not match', () => {
    expect(parsePathwaysFlowVariant('PathwaysFlow=direct')).toBe('career');
  });

  it('uses the first occurrence when the param is duplicated, direct first', () => {
    expect(parsePathwaysFlowVariant('pathwaysFlow=direct&pathwaysFlow=career')).toBe('direct');
  });

  it('uses the first occurrence when the param is duplicated, career first', () => {
    expect(parsePathwaysFlowVariant('pathwaysFlow=career&pathwaysFlow=direct')).toBe('career');
  });

  it('accepts a URLSearchParams instance identically to an equivalent raw string', () => {
    expect(parsePathwaysFlowVariant(new URLSearchParams('pathwaysFlow=direct')))
      .toBe(parsePathwaysFlowVariant('pathwaysFlow=direct'));
  });
});

describe('hasPathwaysFlowConflict', () => {
  it('is a conflict when a "pathway" section was built by career mode but the active variant is direct', () => {
    expect(hasPathwaysFlowConflict({ section: 'pathway', pathwayGenerationMode: 'career', flowVariant: 'direct' })).toBe(true);
  });

  it('is a conflict when a "pathway" section was built by direct mode but the active variant is career', () => {
    expect(hasPathwaysFlowConflict({ section: 'pathway', pathwayGenerationMode: 'direct', flowVariant: 'career' })).toBe(true);
  });

  it('is not a conflict when the persisted mode matches the active variant', () => {
    expect(hasPathwaysFlowConflict({ section: 'pathway', pathwayGenerationMode: 'career', flowVariant: 'career' })).toBe(false);
    expect(hasPathwaysFlowConflict({ section: 'pathway', pathwayGenerationMode: 'direct', flowVariant: 'direct' })).toBe(false);
  });

  it('is not a conflict on "pathway" when pathwayGenerationMode is null (legacy pathway with no recorded mode)', () => {
    expect(hasPathwaysFlowConflict({ section: 'pathway', pathwayGenerationMode: null, flowVariant: 'career' })).toBe(false);
    expect(hasPathwaysFlowConflict({ section: 'pathway', pathwayGenerationMode: null, flowVariant: 'direct' })).toBe(false);
  });

  it('is a conflict on "profile" whenever the active variant is direct, regardless of mode', () => {
    expect(hasPathwaysFlowConflict({ section: 'profile', pathwayGenerationMode: null, flowVariant: 'direct' })).toBe(true);
    expect(hasPathwaysFlowConflict({ section: 'profile', pathwayGenerationMode: 'career', flowVariant: 'direct' })).toBe(true);
    expect(hasPathwaysFlowConflict({ section: 'profile', pathwayGenerationMode: 'direct', flowVariant: 'direct' })).toBe(true);
  });

  it('is never a conflict on "profile" when the active variant is career', () => {
    expect(hasPathwaysFlowConflict({ section: 'profile', pathwayGenerationMode: null, flowVariant: 'career' })).toBe(false);
    expect(hasPathwaysFlowConflict({ section: 'profile', pathwayGenerationMode: 'career', flowVariant: 'career' })).toBe(false);
  });

  it('is never a conflict on "onboarding", for any mode/variant combination', () => {
    expect(hasPathwaysFlowConflict({ section: 'onboarding', pathwayGenerationMode: null, flowVariant: 'career' })).toBe(false);
    expect(hasPathwaysFlowConflict({ section: 'onboarding', pathwayGenerationMode: null, flowVariant: 'direct' })).toBe(false);
    expect(hasPathwaysFlowConflict({ section: 'onboarding', pathwayGenerationMode: 'career', flowVariant: 'direct' })).toBe(false);
    expect(hasPathwaysFlowConflict({ section: 'onboarding', pathwayGenerationMode: 'direct', flowVariant: 'career' })).toBe(false);
  });
});
