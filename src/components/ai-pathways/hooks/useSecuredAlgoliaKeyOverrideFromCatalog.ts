import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { logError } from '@edx/frontend-platform/logging';
import { fetchSecuredAlgoliaKeyOverrideFromCatalog } from '../services/algoliaOverride';

/**
 * Dev-only hook: checks for `?enterprise_customer_uuid=<uuid>` and, if present,
 * fetches a secured Algolia key directly from enterprise-catalog.
 *
 * Returns:
 *  - securedAlgoliaApiKeyOverride: string | null
 *  - isLoading: boolean
 *  - error: Error | null
 */
export default function useSecuredAlgoliaKeyOverrideFromCatalog() {
  const { search } = useLocation();

  const [securedAlgoliaApiKeyOverride, setSecuredAlgoliaApiKeyOverride] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setIsLoading(true);
      setError(null);

      try {
        const key = await fetchSecuredAlgoliaKeyOverrideFromCatalog({ search });
        if (isMounted) {
          setSecuredAlgoliaApiKeyOverride(key);
        }
      } catch (e) {
        if (isMounted) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setSecuredAlgoliaApiKeyOverride(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    run().catch(e => logError(e));

    return () => {
      isMounted = false;
    };
  }, [search]);

  return {
    securedAlgoliaApiKeyOverride,
    isLoading,
    error,
  };
}
