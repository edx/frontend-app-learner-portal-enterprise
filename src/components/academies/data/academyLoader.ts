import {
  generatePath, LoaderFunctionArgs, Params, redirect,
} from 'react-router-dom';

import { ensureAuthenticatedUser } from '../../app/routes/data';
import { extractEnterpriseCustomer, queryAcademiesDetail, resolveCanViewAcademies } from '../../app/data';

type AcademyRouteParams<Key extends string = string> = Params<Key> & {
  readonly academyUUID: string;
  readonly enterpriseSlug: string;
};
interface AcademyLoaderFunctionArgs extends LoaderFunctionArgs {
  params: AcademyRouteParams;
}

const makeAcademiesLoader: MakeRouteLoaderFunctionWithQueryClient = function makeAcademiesLoader(queryClient) {
  return async function academiesLoader({ params, request }: AcademyLoaderFunctionArgs) {
    const requestUrl = new URL(request.url);
    const authenticatedUser = await ensureAuthenticatedUser(requestUrl, params);
    // User is not authenticated, so we can't do anything in this loader.
    if (!authenticatedUser) {
      return null;
    }

    const { academyUUID, enterpriseSlug } = params;
    const enterpriseCustomer = await extractEnterpriseCustomer({
      requestUrl,
      queryClient,
      authenticatedUser,
      enterpriseSlug,
    });
    if (!enterpriseCustomer) {
      return null;
    }

    // Ineligible customers and learners have no Academies entry points, so deep links to the
    // academy detail route are redirected back to search. This is the same predicate the search
    // loader uses to decide whether to redirect *into* a single academy, so the two cannot loop.
    const canViewAcademies = await resolveCanViewAcademies({
      requestUrl,
      queryClient,
      authenticatedUser,
      enterpriseSlug,
      enterpriseCustomer,
    });
    if (!canViewAcademies) {
      return redirect(generatePath('/:enterpriseSlug/search', { enterpriseSlug }));
    }

    await queryClient.ensureQueryData(queryAcademiesDetail(academyUUID, enterpriseCustomer.uuid));

    return null;
  };
};

export default makeAcademiesLoader;
