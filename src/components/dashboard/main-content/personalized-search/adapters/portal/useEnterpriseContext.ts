import { useEnterpriseCustomer } from '../../../../../app/data';
import type { EnterpriseContext } from '../../feature/deps';

/** The learner portal's current enterprise customer. */
export const useEnterpriseContext = (): EnterpriseContext => {
  const { data } = useEnterpriseCustomer();
  return { uuid: data?.uuid as string | undefined, slug: data?.slug as string | undefined };
};
