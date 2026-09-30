import dayjs from 'dayjs';
import {
  createArrayFromValue,
  defaultQueryClientRetryHandler,
  fixedEncodeURIComponent,
  getLocalizedHelpCenterUrl,
  hasTruthyValue,
  hasValidStartExpirationDates,
  isDefinedAndNotNull,
  isDefinedAndNull,
} from '../common';

function assertTestCaseEquals(testCase, expectedValue) {
  const result = createArrayFromValue(testCase);
  expect(result).toEqual(expectedValue);
}

describe('fixedEncodeURIComponent', () => {
  it('returns correctly encoded string', () => {
    const str = 'Python Programming Language';
    const expected = 'Python%20Programming%20Language';
    const result = fixedEncodeURIComponent(str);
    expect(result).toEqual(expected);
  });

  it('returns encoded string for characters that are not supported by encodeURIComponent', () => {
    const str = 'Python (Programming Language)';
    const expected = 'Python%20%28Programming%20Language%29';
    const result = fixedEncodeURIComponent(str);
    expect(result).toEqual(expected);
  });
});

describe('createArrayFromValue', () => {
  it('handles array value', () => {
    const testCase = [null, null];
    assertTestCaseEquals(testCase, testCase);
  });

  it('handles other values', () => {
    let testCase = 2;
    assertTestCaseEquals(testCase, [testCase]);

    testCase = { test: 'key' };
    assertTestCaseEquals(testCase, [testCase]);

    testCase = 2;
    assertTestCaseEquals(testCase, [testCase]);

    testCase = undefined;
    assertTestCaseEquals(testCase, [testCase]);
  });
});

describe('isDefinedAndNotNull', () => {
  it('returns false when passed a null', () => {
    const result = isDefinedAndNotNull(null);
    expect(result).toBeFalsy();
  });

  it('returns false when passed an array of nulls', () => {
    const result = isDefinedAndNotNull([null, null]);
    expect(result).toBeFalsy();
  });

  it('returns false when passed an array with 1 null', () => {
    const result = isDefinedAndNotNull(['test', null]);
    expect(result).toBeFalsy();
  });

  it('returns true when passed an array with no nulls', () => {
    const result = isDefinedAndNotNull(['test', 1]);
    expect(result).toBeTruthy();
  });
});

describe('isDefinedAndNull', () => {
  it('returns true when passed a null', () => {
    const result = isDefinedAndNull(null);
    expect(result).toBeTruthy();
  });

  it('returns true when passed an array of nulls', () => {
    const result = isDefinedAndNull([null, null]);
    expect(result).toBeTruthy();
  });

  it('returns false when passed an array with 1 null', () => {
    const result = isDefinedAndNull(['test', null]);
    expect(result).toBeFalsy();
  });

  it('returns false when passed an array with no nulls', () => {
    const result = isDefinedAndNull(['test', 1]);
    expect(result).toBeFalsy();
  });
});

describe('hasTruthyValue', () => {
  it('returns true when passed a non-empty string', () => {
    const result = hasTruthyValue('test');
    expect(result).toBeTruthy();
  });

  it('returns true when passed an array with no nulls', () => {
    const result = hasTruthyValue(['test', 1]);
    expect(result).toBeTruthy();
  });

  it('returns false when passed an array with 1 null', () => {
    const result = hasTruthyValue(['test', null]);
    expect(result).toBeFalsy();
  });

  it('returns false when passed an array with 1 empty string', () => {
    const result = hasTruthyValue(['']);
    expect(result).toBeFalsy();
  });
});

const now = dayjs();
const validStartDate = dayjs(now).subtract(5, 'days');
const validEndDate = dayjs(now).add(5, 'days');
const invalidStartDate = dayjs(now).add(1, 'days');
const invalidEndDate = dayjs(now).subtract(1, 'days');

describe('hasValidStartExpirationDates', () => {
  it('returns true when now is between startDate and endDate', () => {
    const validStartEnd = {
      startDate: validStartDate,
      endDate: validEndDate,
    };
    const result = hasValidStartExpirationDates(validStartEnd);
    expect(result).toBeTruthy();
  });

  it('returns false when startDate is invalid', () => {
    const invalidStart = {
      startDate: invalidStartDate,
      endDate: validEndDate,
    };
    const result = hasValidStartExpirationDates(invalidStart);
    expect(result).toBeFalsy();
  });

  it('returns false when endDate is invalid', () => {
    const invalidEnd = {
      startDate: validStartDate,
      endDate: invalidEndDate,
    };
    const result = hasValidStartExpirationDates(invalidEnd);
    expect(result).toBeFalsy();
  });
});

describe('defaultQueryClientRetryHandler', () => {
  it.each([
    {
      retryCount: 0,
      error: { customAttributes: { httpErrorStatus: 500 } },
      expectedShouldRetry: true,
    },
    {
      retryCount: 3,
      error: { customAttributes: { httpErrorStatus: 500 } },
      expectedShouldRetry: false,
    },
    // Axios 404
    {
      retryCount: 0,
      error: { customAttributes: { httpErrorStatus: 404 } },
      expectedShouldRetry: false,
    },
    // Regular 404
    {
      retryCount: 0,
      error: { response: { status: 404 } },
      expectedShouldRetry: false,
    },
  ])('returns expected output for each test case', ({
    retryCount,
    error,
    expectedShouldRetry,
  }) => {
    const shouldRetry = defaultQueryClientRetryHandler(retryCount, error);
    expect(shouldRetry).toBe(expectedShouldRetry);
  });
});

describe('getLocalizedHelpCenterUrl', () => {
  it.each([
    { locale: 'en', expectedLanguage: 'en_US' },
    { locale: 'es-419', expectedLanguage: 'es' },
    { locale: 'es-es', expectedLanguage: 'es' },
    { locale: 'fr', expectedLanguage: 'fr' },
    { locale: 'pt-br', expectedLanguage: 'pt_BR' },
    { locale: 'zh-cn', expectedLanguage: 'zh_CN' },
    // Region-specific locales must not collapse onto the wrong variant via their language subtag.
    { locale: 'pt-PT', expectedLanguage: 'pt_PT' },
    { locale: 'zh-HK', expectedLanguage: 'zh_TW' },
  ])('sets the language query param for locale $locale', ({ locale, expectedLanguage }) => {
    const result = new URL(getLocalizedHelpCenterUrl('https://help.edx.org/edxlearner/s/', locale));
    expect(result.origin + result.pathname).toEqual('https://help.edx.org/edxlearner/s/');
    expect(result.searchParams.get('language')).toEqual(expectedLanguage);
  });

  it('replaces an existing language query param and preserves other params and the hash', () => {
    const result = new URL(getLocalizedHelpCenterUrl(
      'https://help.edx.org/edxlearner/s/article/pacing?language=en_US&foo=bar#answer',
      'es-419',
    ));
    expect(result.searchParams.getAll('language')).toEqual(['es']);
    expect(result.searchParams.get('foo')).toEqual('bar');
    expect(result.hash).toEqual('#answer');
  });

  it.each([
    { url: undefined, locale: 'es-419' },
    { url: null, locale: 'es-419' },
    { url: '', locale: 'es-419' },
    { url: 'not a url', locale: 'es-419' },
    { url: 'https://help.edx.org/edxlearner/s/', locale: undefined },
  ])('returns the url unchanged for url=$url, locale=$locale', ({ url, locale }) => {
    expect(getLocalizedHelpCenterUrl(url, locale)).toEqual(url);
  });
});
