import {
  generatePath, LoaderFunctionArgs, Params, redirect,
} from 'react-router-dom';
import { getConfig } from '@edx/frontend-platform/config';
import { ensureAuthenticatedUser } from '../../app/routes/data/utils';
import {
  extractEnterpriseCustomer,
  isFindACourseDisabledForEnterpriseCustomer,
  queryAcademiesList,
  resolveCanViewAcademies,
  safeEnsureQueryDataAcademiesList,
  safeEnsureQueryDataContentHighlightSets,
} from '../../app/data';

type SearchRouteParams<Key extends string = string> = Params<Key> & {
  readonly enterpriseSlug: string;
};
interface SearchLoaderFunctionArgs extends LoaderFunctionArgs {
  params: SearchRouteParams;
}
interface Academy {
  uuid: string;
}

const makeSearchLoader: MakeRouteLoaderFunctionWithQueryClient = function makeSearchLoader(queryClient) {
  return async function searchLoader({ params, request } : SearchLoaderFunctionArgs) {
    const requestUrl = new URL(request.url);
    const authenticatedUser = await ensureAuthenticatedUser(requestUrl, params);

    // User is not authenticated, so we can't do anything in this loader.
    if (!authenticatedUser) {
      return null;
    }

    const { enterpriseSlug } = params;

    const enterpriseCustomer = await extractEnterpriseCustomer({
      requestUrl,
      queryClient,
      authenticatedUser,
      enterpriseSlug,
    });
    if (!enterpriseCustomer) {
      return null;
    }

    // Only ineligible customers/learners skip the academies list fetch entirely; eligibility must
    // be resolved first since it gates both the prefetch and the single-academy redirect below.
    const canViewAcademies = await resolveCanViewAcademies({
      requestUrl,
      queryClient,
      authenticatedUser,
      enterpriseSlug,
      enterpriseCustomer,
    });

    const searchData: Promise<unknown>[] = [];
    if (canViewAcademies) {
      searchData.push(
        safeEnsureQueryDataAcademiesList({
          queryClient,
          enterpriseCustomer,
        }),
      );
    }
    if (getConfig().FEATURE_CONTENT_HIGHLIGHTS) {
      searchData.push(
        safeEnsureQueryDataContentHighlightSets({
          queryClient,
          enterpriseCustomer,
        }),
      );
    }

    await Promise.all(searchData);

    if (canViewAcademies && enterpriseCustomer.enableOneAcademy) {
      const academiesListQuery = queryAcademiesList(enterpriseCustomer.uuid);
      const academies = queryClient.getQueryData<Academy[]>(academiesListQuery.queryKey);
      if (academies?.length === 1) {
        const redirectPath = generatePath('/:enterpriseSlug/academies/:academyUUID', {
          enterpriseSlug,
          academyUUID: academies[0].uuid,
        });
        return redirect(redirectPath);
      }
    }

    // Course search ("Find a Course") may be disabled for specific enterprise customers (ENT-12375).
    // Guarding the route (after the single-academy redirect above) covers direct URLs and bookmarks,
    // plus in-app navigations into search, e.g. the skills quiz exit and the academy loader fallback.
    if (isFindACourseDisabledForEnterpriseCustomer(enterpriseCustomer.uuid)) {
      return redirect(generatePath('/:enterpriseSlug', { enterpriseSlug }));
    }

    return null;
  };
};

export default makeSearchLoader;
