import { NIL as NIL_UUID } from 'uuid';

import { ASSIGNMENTS_EXPIRING_WARNING_LOCALSTORAGE_KEY, BUDGET_STATUSES } from './constants';

/**
 * Determines whether there are any unacknowledged assignments.
 *
 * @param {Array} assignments - Metadata about the assignments.
 * @returns {Boolean} - Returns true if there are any unacknowledged assignments, otherwise false.
 */
export function getHasUnacknowledgedAssignments(assignments) {
  return assignments.some((assignment) => !assignment.learnerAcknowledged);
}

export function getExpiringAssignmentsAcknowledgementState(assignments) {
  const alreadyAcknowledgedExpiringAssignments = JSON.parse(
    global.localStorage.getItem(ASSIGNMENTS_EXPIRING_WARNING_LOCALSTORAGE_KEY),
  ) || [];

  const expiringAssignments = [];
  const unacknowledgedExpiringAssignments = [];
  const acknowledgedExpiringAssignments = [];

  assignments.forEach((assignment) => {
    if (!assignment.isExpiringAssignment) {
      return;
    }
    expiringAssignments.push(assignment);
    if (alreadyAcknowledgedExpiringAssignments.includes(assignment.uuid)) {
      acknowledgedExpiringAssignments.push(assignment);
    } else {
      unacknowledgedExpiringAssignments.push(assignment);
    }
  });

  return {
    expiringAssignments,
    unacknowledgedExpiringAssignments,
    hasUnacknowledgedExpiringAssignments: unacknowledgedExpiringAssignments.length > 0,
    acknowledgedExpiringAssignments,
    hasAcknowledgedExpiringAssignments: acknowledgedExpiringAssignments.length > 0,
  };
}

/**
 * Whether the Learner Pathways feature is enabled for a specific enterprise customer, per the
 * FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS allowlist — always a list of enterprise
 * customer UUIDs (or an empty list). The nil UUID (`uuid`'s `NIL` export) is a wildcard meaning
 * "enabled for every enterprise customer".
 *
 * @param {string} enterpriseCustomerUuid - The current enterprise customer's UUID.
 * @param {string[]} allowlist - The FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS config value.
 * @returns {Boolean} - Returns true if the feature is enabled for this customer.
 */
export function isLearnerPathwaysEnabledForEnterpriseCustomer(enterpriseCustomerUuid, allowlist) {
  const normalizedAllowlist = allowlist.filter(Boolean);
  return normalizedAllowlist.includes(NIL_UUID)
    || (!!enterpriseCustomerUuid && normalizedAllowlist.includes(enterpriseCustomerUuid));
}

//  Utility function to check the budget status
export const getStatusMetadata = ({
  isPlanApproachingExpiry,
  endDateStr,
  currentDate = new Date(),
}) => {
  const endDate = new Date(endDateStr);

  if (isPlanApproachingExpiry) {
    return {
      status: BUDGET_STATUSES.expiring,
      badgeVariant: 'warning',
      term: 'Expiring',
      date: endDateStr,
    };
  }

  // Check if budget is current (today's date between start/end dates)
  if (currentDate <= endDate) {
    return {
      status: BUDGET_STATUSES.active,
      badgeVariant: 'success',
      term: 'Expires',
      date: endDateStr,
    };
  }

  // Otherwise, budget must be expired
  return {
    status: BUDGET_STATUSES.expired,
    badgeVariant: 'light',
    term: 'Expired',
    date: endDateStr,
  };
};
