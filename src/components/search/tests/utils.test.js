import { getSearchFacetFilters } from '../utils';

jest.mock('../../../config', () => ({
  features: { PROGRAM_TYPE_FACET: true, NEW_CONTENT_FACET: true },
}));

describe('getSearchFacetFilters', () => {
  // Mock intl object to return `defaultMessage` of the argument.
  const intl = {
    formatMessage: message => message.defaultMessage,
  };
  it('should update search filters correctly', () => {
    const result = getSearchFacetFilters(intl);
    expect(result.find(item => item.attribute === 'program_type')).toBeDefined();
  });
  it('appends the new content facet when the feature flag is enabled', () => {
    const result = getSearchFacetFilters(intl);
    expect(result.find(item => item.attribute === 'is_new_content')).toBeDefined();
  });
  it('inserts the translation_languages facet after level_type when the feature flag is enabled', () => {
    const result = getSearchFacetFilters(intl);
    const levelTypeIndex = result.findIndex(item => item.attribute === 'level_type');
    const translationIndex = result.findIndex(item => item.attribute === 'translation_languages');
    expect(translationIndex).toBe(levelTypeIndex + 1);
    expect(result[translationIndex]).toMatchObject({
      attribute: 'translation_languages',
      title: 'Translation Languages',
      isSortedAlphabetical: true,
    });
  });
});
