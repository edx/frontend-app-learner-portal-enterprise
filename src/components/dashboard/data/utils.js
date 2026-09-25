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
 * FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS allowlist — a list of enterprise
 * customer UUIDs, or null/undefined/empty when unset (observed in production: getConfig() can
 * return null for this field, not just `[]`). The nil UUID (`uuid`'s `NIL` export) is a wildcard
 * meaning "enabled for every enterprise customer".
 *
 * @param {string} enterpriseCustomerUuid - The current enterprise customer's UUID.
 * @param {string[]|null} allowlist - The FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS config value.
 * @returns {Boolean} - Returns true if the feature is enabled for this customer.
 */
export function isLearnerPathwaysEnabledForEnterpriseCustomer(enterpriseCustomerUuid, allowlist) {
  const normalizedAllowlist = (allowlist || []).filter(Boolean);
  return normalizedAllowlist.includes(NIL_UUID)
    || (!!enterpriseCustomerUuid && normalizedAllowlist.includes(enterpriseCustomerUuid));
}

/**
 * Whether the learner portal pathway sidebar message is enabled for a specific enterprise
 * customer, per the FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER config value — a
 * single enterprise customer UUID, or null/undefined/empty when unset. The nil UUID (`uuid`'s
 * `NIL` export) is a wildcard meaning "enabled for every enterprise customer". The comparison is
 * case-insensitive, since UUIDs are canonically case-insensitive and this value is frequently
 * hand-copied into env/config files.
 *
 * @param {string} enterpriseCustomerUuid - The current enterprise customer's UUID.
 * @param {string|null} allowedEnterpriseCustomerUuid - The
 *   FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER config value.
 * @returns {Boolean} - Returns true if the feature is enabled for this customer.
 */
export function isPathwayMessageEnabledForEnterpriseCustomer(enterpriseCustomerUuid, allowedEnterpriseCustomerUuid) {
  if (!allowedEnterpriseCustomerUuid) {
    return false;
  }
  if (allowedEnterpriseCustomerUuid.includes(',')) {
    // eslint-disable-next-line no-console
    console.warn(
      'FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER holds a single enterprise customer '
      + 'UUID, not a comma-separated list — this value will not match any customer.',
    );
  }
  const normalizedAllowedUuid = allowedEnterpriseCustomerUuid.toLowerCase();
  return normalizedAllowedUuid === NIL_UUID || normalizedAllowedUuid === enterpriseCustomerUuid?.toLowerCase();
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
