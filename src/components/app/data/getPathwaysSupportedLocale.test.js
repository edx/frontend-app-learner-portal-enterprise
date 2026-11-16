import { getConfig } from '@edx/frontend-platform/config';
import { getLocale } from '@edx/frontend-platform/i18n';

import { getPathwaysSupportedLocale } from './utils';

jest.mock('@edx/frontend-platform/config', () => ({
  ...jest.requireActual('@edx/frontend-platform/config'),
  getConfig: jest.fn(),
}));
jest.mock('@edx/frontend-platform/i18n', () => ({
  ...jest.requireActual('@edx/frontend-platform/i18n'),
  getLocale: jest.fn(),
}));

describe('getPathwaysSupportedLocale', () => {
  it('uses the base language of a supported regional locale', () => {
    getConfig.mockReturnValue({ SUPPORTED_ALGOLIA_LANGUAGE_FILTERS: { en: 'English', es: 'Spanish' } });
    getLocale.mockReturnValue('es-419');
    expect(getPathwaysSupportedLocale()).toBe('es');
  });

  it('falls back to English for an unsupported locale or no config', () => {
    getConfig.mockReturnValue({ SUPPORTED_ALGOLIA_LANGUAGE_FILTERS: { en: 'English', es: 'Spanish' } });
    getLocale.mockReturnValue('fr-CA');
    expect(getPathwaysSupportedLocale()).toBe('en');
    getConfig.mockReturnValue({});
    getLocale.mockReturnValue('es');
    expect(getPathwaysSupportedLocale()).toBe('en');
  });
});
