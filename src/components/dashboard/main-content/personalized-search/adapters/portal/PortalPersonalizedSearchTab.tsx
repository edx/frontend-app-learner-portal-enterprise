import PersonalizedSearchTab from '../../feature/PersonalizedSearchTab';
import type { PersonalizedSearchTabProps } from '../../feature/PersonalizedSearchTab';
import { portalDeps } from './portalDeps';

export type PortalPersonalizedSearchTabProps = Omit<PersonalizedSearchTabProps, 'deps'>;

/** The tab as the learner portal mounts it: the feature wired to the portal's adapters. */
const PortalPersonalizedSearchTab = (props: PortalPersonalizedSearchTabProps) => (
  <PersonalizedSearchTab deps={portalDeps} {...props} />
);

export default PortalPersonalizedSearchTab;
