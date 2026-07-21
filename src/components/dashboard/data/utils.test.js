import { NIL as NIL_UUID } from 'uuid';

import { isLearnerPathwaysEnabledForEnterpriseCustomer } from './utils';

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
