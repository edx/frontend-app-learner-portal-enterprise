import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DataTable,
  Icon,
  Skeleton,
  Stack,
} from '@openedx/paragon';
import { CheckCircle, Error as ErrorIcon, Refresh, Warning } from '@openedx/paragon/icons';

import useAlgoliaSearch from '../../app/data/hooks/useAlgoliaSearch';
import useEnterpriseCustomer from '../../app/data/hooks/useEnterpriseCustomer';
import useSearchCatalogs from '../../app/data/hooks/useSearchCatalogs';
import { getSupportedLocale } from '../../app/data/utils';
import { contentDiscoveryService } from '../services/contentDiscovery.service';
import { DEFAULT_ATTRIBUTES_TO_RETRIEVE } from '../services/algoliaRequestBuilder';

type FacetMap = Record<string, Record<string, number>>;

type FacetDebugState = {
  facets: FacetMap | null;
  filters: string;
  nbHits: number | null;
  processingTimeMS: number | null;
  rawQuery: string;
};

const FACET_ATTRIBUTES = ['skills.name', 'industry_names', 'job_sources'];

const buildFacetRows = (facets: FacetMap | null) => {
  if (!facets) {
    return [];
  }

  return Object.entries(facets).flatMap(([facetName, values]) => (
    Object.entries(values).map(([value, count]) => ({
      id: `${facetName}-${value}`,
      facetName,
      value,
      count,
    }))
  ));
};

export const FacetDebugCard = () => {
  const { searchIndex } = useAlgoliaSearch();
  const enterpriseCustomerResult = useEnterpriseCustomer();
  const enterpriseCustomer = (enterpriseCustomerResult.data || {}) as { uuid?: string };
  const searchCatalogs = useSearchCatalogs();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugState, setDebugState] = useState<FacetDebugState | null>(null);

  const bootstrapInput = useMemo(() => ({
    query: '',
    requiredFilters: {
      ...(enterpriseCustomer.uuid ? { enterprise_customer_uuid: [enterpriseCustomer.uuid] } : {}),
      ...(searchCatalogs?.length ? { catalog_query_uuids: searchCatalogs } : {}),
      ...(getSupportedLocale() ? { locale: [getSupportedLocale()] } : {}),
    },
    optionalFilters: {},
    excludedFilters: {},
    attributesToRetrieve: DEFAULT_ATTRIBUTES_TO_RETRIEVE,
    hitsPerPage: 0,
    metadata: {
      source: 'ai-pathways' as const,
      mode: 'assembly' as const,
    },
  }), [enterpriseCustomer.uuid, searchCatalogs]);

  const filterString = useMemo(
    () => contentDiscoveryService.buildFilters(bootstrapInput),
    [bootstrapInput],
  );

  const handleFetchFacets = useCallback(async () => {
    if (!searchIndex) {
      setError('Algolia search index is unavailable.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await searchIndex.search(bootstrapInput.query, {
        filters: filterString,
        facets: FACET_ATTRIBUTES,
        maxValuesPerFacet: 25,
        hitsPerPage: 0,
        attributesToRetrieve: bootstrapInput.attributesToRetrieve,
        analyticsTags: ['ai-pathways', 'debug:facet-bootstrap'],
      });

      setDebugState({
        facets: response.facets ?? null,
        filters: filterString,
        nbHits: response.nbHits ?? null,
        processingTimeMS: response.processingTimeMS ?? null,
        rawQuery: bootstrapInput.query,
      });
    } catch (err: any) {
      setError(err?.message || 'Unknown Algolia error while retrieving facets.');
      setDebugState(null);
    } finally {
      setIsLoading(false);
    }
  }, [searchIndex, bootstrapInput, filterString]);

  const rows = useMemo(() => buildFacetRows(debugState?.facets ?? null), [debugState?.facets]);
  const hasFacets = rows.length > 0;

  return (
    <Card className="mb-4">
      <Card.Header
        title="Algolia Facet Debug"
        subtitle="Validate whether the taxonomy index returns bootstrap facets."
        actions={(
          <Button
            variant="outline-primary"
            iconBefore={Refresh}
            onClick={handleFetchFacets}
            disabled={isLoading}
          >
            {isLoading ? 'Checking…' : 'Check facets'}
          </Button>
        )}
      />
      <Card.Body>
        <Stack gap={3}>
          {!searchIndex && (
            <Alert variant="danger" icon={ErrorIcon}>
              Algolia search index is not available from <code>useAlgoliaSearch()</code>.
            </Alert>
          )}

          {error && (
            <Alert variant="danger" icon={ErrorIcon}>
              {error}
            </Alert>
          )}

          {!error && debugState && hasFacets && (
            <Alert variant="success" icon={CheckCircle}>
              Facets were retrieved successfully.
            </Alert>
          )}

          {!error && debugState && !hasFacets && (
            <Alert variant="warning" icon={Warning}>
              Request succeeded, but no facet values were returned for the requested attributes.
            </Alert>
          )}

          <div className="small text-muted">
            <div><strong>Query:</strong> <code>{JSON.stringify(debugState?.rawQuery ?? bootstrapInput.query)}</code></div>
            <div><strong>Filters:</strong> <code>{debugState?.filters || filterString || '(none)'}</code></div>
            <div><strong>Requested facets:</strong> <code>{FACET_ATTRIBUTES.join(', ')}</code></div>
            {debugState && (
              <>
                <div><strong>nbHits:</strong> {debugState.nbHits ?? 'n/a'}</div>
                <div><strong>processingTimeMS:</strong> {debugState.processingTimeMS ?? 'n/a'}</div>
              </>
            )}
          </div>

          {isLoading ? (
            <Skeleton count={5} />
          ) : (
            <DataTable
              isSortable
              itemCount={rows.length}
              data={rows}
              columns={[
                {
                  Header: 'Facet',
                  accessor: 'facetName',
                },
                {
                  Header: 'Value',
                  accessor: 'value',
                },
                {
                  Header: 'Count',
                  accessor: 'count',
                },
              ]}
            >
              <DataTable.Table />
              <DataTable.EmptyTable content="No facet values returned yet." />
              <DataTable.TableFooter />
            </DataTable>
          )}
        </Stack>
      </Card.Body>
    </Card>
  );
};
