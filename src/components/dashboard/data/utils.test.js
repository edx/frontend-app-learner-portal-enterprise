import { NIL as NIL_UUID } from 'uuid';

import { isLearnerPathwaysEnabledForEnterpriseCustomer } from './utils';

const CUSTOMER_UUID = '11111111-1111-1111-1111-111111111111';
const OTHER_UUID = '22222222-2222-2222-2222-222222222222';

describe('isLearnerPathwaysEnabledForEnterpriseCustomer', () => {
  it('returns true when the customer uuid is present in a comma-separated string', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, `${OTHER_UUID},${CUSTOMER_UUID}`)).toBe(true);
  });

  it('tolerates surrounding whitespace around each uuid in the comma-separated string', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, ` ${OTHER_UUID} , ${CUSTOMER_UUID} `)).toBe(true);
  });

  it('returns true for a single-uuid string with no commas', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, CUSTOMER_UUID)).toBe(true);
  });

  it('returns true for any customer when the nil uuid is present', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, NIL_UUID)).toBe(true);
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(OTHER_UUID, NIL_UUID)).toBe(true);
  });

  it('returns true when the nil uuid is mixed in among other real uuids', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(OTHER_UUID, `${CUSTOMER_UUID},${NIL_UUID}`)).toBe(true);
  });

  it('returns false when the allowlist is the empty-array fallback', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, [])).toBe(false);
  });

  it('returns false when the allowlist is undefined or null', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, undefined)).toBe(false);
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, null)).toBe(false);
  });

  it('returns false when the customer uuid is not present in the allowlist', () => {
    expect(isLearnerPathwaysEnabledForEnterpriseCustomer(CUSTOMER_UUID, OTHER_UUID)).toBe(false);
  });
});
