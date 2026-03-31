import React from 'react';
import { Card, DataTable, Badge, Alert } from '@openedx/paragon';
import { TaxonomyFilters } from '../types';

interface FacetBootstrapDebugProps {
  filters: TaxonomyFilters | null;
}

export const FacetBootstrapDebug: React.FC<FacetBootstrapDebugProps> = ({ filters }) => {
  const hasData = filters && (
    filters.skills.length > 0 ||
    filters.industries.length > 0 ||
    filters.jobSources.length > 0
  );

  return (
    <Card className="mb-4 border-debug shadow-sm">
      <Card.Header title="Facet Bootstrap Debug" />
      <Card.Body>
        {!filters ? (
          <Alert variant="warning">Bootstrap has not run yet or returned no data.</Alert>
        ) : (
          <>
            <div className="mb-3">
              <Badge variant="success" className="mr-2">Bootstrap Ran</Badge>
              <span className="small text-muted">
                Skills: {filters.skills.length} |
                Industries: {filters.industries.length} |
                Job Sources: {filters.jobSources.length}
              </span>
            </div>

            <DataTable
              itemCount={3}
              data={[
                { facet: 'Skills', count: filters.skills.length, top: filters.skills.slice(0, 3).map(f => f.label).join(', ') },
                { facet: 'Industries', count: filters.industries.length, top: filters.industries.slice(0, 3).map(f => f.label).join(', ') },
                { facet: 'Job Sources', count: filters.jobSources.length, top: filters.jobSources.slice(0, 3).map(f => f.label).join(', ') },
              ]}
              columns={[
                { Header: 'Facet Group', accessor: 'facet' },
                { Header: 'Total Count', accessor: 'count' },
                { Header: 'Top Values', accessor: 'top' },
              ]}
            >
              <DataTable.Table />
            </DataTable>

            <details className="mt-3">
              <summary className="small text-primary cursor-pointer">View Raw JSON</summary>
              <pre className="x-small bg-light p-2 mt-2">
                {JSON.stringify(filters, null, 2)}
              </pre>
            </details>
          </>
        )}
      </Card.Body>
    </Card>
  );
};
