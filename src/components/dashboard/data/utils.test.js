import { NIL as NIL_UUID } from 'uuid';

import { isLearnerPathwaysEnabledForEnterpriseCustomer, isPathwayMessageEnabledForEnterpriseCustomer } from './utils';

const CUSTOMER_UUID = '11111111-1111-1111-1111-111111111111';
const OTHER_UUID = '22222222-2222-2222-2222-222222222222';

describe('isLearnerPathwaysEnabledForEnterpriseCustomer', () => {
  // Regression coverage for the real production error: getConfig() can return null for this
  // field (not just the `[]` src/index.tsx's own fallback suggests), and `null.filter` threw.
  it('returns false when the allowlist is null, regardless of the customer', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, null)).toBe(false);
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(OTHER_UUID, null)).toBe(false);
  });

  it('returns false when the allowlist is undefined', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, undefined)).toBe(false);
  });

  it('returns false when the allowlist is empty', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, [])).toBe(false);
  });

  it('returns true for any customer when the nil uuid is present', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, [NIL_UUID])).toBe(true);
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(OTHER_UUID, [NIL_UUID])).toBe(true);
  });

  it('returns true for the nil uuid wildcard even when no customer uuid is available', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(null, [NIL_UUID])).toBe(true);
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(undefined, [NIL_UUID])).toBe(true);
  });

  it('returns true when the customer uuid is present in the allowlist', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, [CUSTOMER_UUID])).toBe(true);
  });

  it('returns true when the customer uuid is present but not first in the allowlist', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, [OTHER_UUID, CUSTOMER_UUID])).toBe(true);
  });

  it('returns false when the customer uuid is not present in the allowlist', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, [OTHER_UUID])).toBe(false);
  });

  it('returns true when the nil uuid is mixed in among other real uuids, for a non-matching customer', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(OTHER_UUID, [CUSTOMER_UUID, NIL_UUID])).toBe(true);
  });

  it('returns false when the customer uuid is missing and the allowlist has no nil uuid', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(null, [CUSTOMER_UUID])).toBe(false);
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(undefined, [CUSTOMER_UUID])).toBe(false);
  });

  it('filters out falsy entries in the allowlist without affecting a real match', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, ['', null, undefined, CUSTOMER_UUID])).toBe(true);
  });

  it('filters out falsy entries in the allowlist and still returns false with no real match', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, ['', null, undefined])).toBe(false);
  });
});

describe('isPathwayMessageEnabledForEnterpriseCustomer', () => {
  it('returns false when the allowed uuid is null, regardless of the customer', () => {
    expect(isPathwayMessageEnabledForEnterpriseCustomer(CUSTOMER_UUID, null)).toBe(false);
  });

  it('returns false when the allowed uuid is undefined or an empty string', () => {
    expect(isPathwayMessageEnabledForEnterpriseCustomer(CUSTOMER_UUID, undefined)).toBe(false);
    expect(isPathwayMessageEnabledForEnterpriseCustomer(CUSTOMER_UUID, '')).toBe(false);
  });

  it('returns true for any customer when the allowed uuid is the nil uuid', () => {
    expect(isPathwayMessageEnabledForEnterpriseCustomer(CUSTOMER_UUID, NIL_UUID)).toBe(true);
    expect(isPathwayMessageEnabledForEnterpriseCustomer(OTHER_UUID, NIL_UUID)).toBe(true);
  });

  it('returns true for the nil uuid wildcard even when no customer uuid is available', () => {
    expect(isPathwayMessageEnabledForEnterpriseCustomer(null, NIL_UUID)).toBe(true);
    expect(isPathwayMessageEnabledForEnterpriseCustomer(undefined, NIL_UUID)).toBe(true);
  });

  it('returns true when the customer uuid matches the allowed uuid exactly', () => {
    expect(isPathwayMessageEnabledForEnterpriseCustomer(CUSTOMER_UUID, CUSTOMER_UUID)).toBe(true);
  });

  it('returns false when the customer uuid does not match the allowed uuid', () => {
    expect(isPathwayMessageEnabledForEnterpriseCustomer(CUSTOMER_UUID, OTHER_UUID)).toBe(false);
  });

  it('returns false when the customer uuid is missing and the allowed uuid is a real uuid', () => {
    expect(isPathwayMessageEnabledForEnterpriseCustomer(null, CUSTOMER_UUID)).toBe(false);
    expect(isPathwayMessageEnabledForEnterpriseCustomer(undefined, CUSTOMER_UUID)).toBe(false);
  });

  it('matches regardless of case', () => {
    expect(isPathwayMessageEnabledForEnterpriseCustomer(CUSTOMER_UUID, CUSTOMER_UUID.toUpperCase())).toBe(true);
    expect(isPathwayMessageEnabledForEnterpriseCustomer(CUSTOMER_UUID.toUpperCase(), CUSTOMER_UUID)).toBe(true);
  });

  it('warns and returns false when the allowed uuid contains a comma', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(isPathwayMessageEnabledForEnterpriseCustomer(CUSTOMER_UUID, `${CUSTOMER_UUID},${OTHER_UUID}`)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('comma-separated list'));
    warnSpy.mockRestore();
  });
});
