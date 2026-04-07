import React from 'react';
import {
  Card, DataTable, Badge, Alert,
} from '@openedx/paragon';
import { TaxonomyFilters, AIPathwaysResponseModel } from '../types';

interface FacetBootstrapDebugProps {
  filters: TaxonomyFilters | null;
  response?: AIPathwaysResponseModel | null;
}

export const FacetBootstrapDebug: React.FC<FacetBootstrapDebugProps> = ({ filters, response }) => (
  <Card className="mb-4 border-debug shadow-sm">
    <Card.Header title="Facet Bootstrap Debug" />
    <Card.Body>
      {!filters ? (
        <Alert variant="warning">Bootstrap has not run yet or returned no data.</Alert>
      ) : (
        <>
          <div className="mb-3">
            <Badge variant="success" className="mr-2">Bootstrap (Stage 1) Ran</Badge>
            <span className="small text-muted">
              Skills: {filters['skills.name'].items.length} |
              Industries: {filters.industry_names.items.length} |
              Job Sources: {filters.job_sources.items.length}
            </span>
          </div>

          {response && (
            <div className="mb-4 border p-2 rounded bg-light">
              <h6 className="font-weight-bold">Staged Flow Details</h6>
              <div className="small mb-2">
                <Badge variant="dark" className="mr-2">Intake</Badge>
                <div><strong>Raw input:</strong> {response.intake.rawQuery}</div>
                <div><strong>Condensed query:</strong> {response.intake.condensedQuery}</div>
              </div>
              <div className="small mb-2">
                <Badge variant="secondary" className="mr-2">Stage 1: First Algolia Request</Badge>
                <div><strong>Query:</strong> {response.initialDiscovery.firstRequest.query}</div>
                <div><strong>Filters:</strong> {response.initialDiscovery.firstRequest.filters || '(none)'}</div>
                <div>
                  <strong>Params:</strong>
                  {' '}
                  hitsPerPage={response.initialDiscovery.firstRequest.hitsPerPage},
                  {' '}
                  maxValuesPerFacet={response.initialDiscovery.firstRequest.maxValuesPerFacet},
                  {' '}
                  facets={response.initialDiscovery.firstRequest.facets.join(', ')}
                </div>
                <div><strong>Hits found:</strong> {response.initialDiscovery.totalHits}</div>
                <div>
                  <strong>Top hit names:</strong>
                  {' '}
                  {response.initialDiscovery.hits.slice(0, 3).map(hit => hit.title).join(', ') || 'None'}
                </div>
                <div>
                  <strong>Top returned skills:</strong>
                  {' '}
                  {response.initialDiscovery.topSkills?.join(', ') || 'None'}
                </div>
                <div>
                  <strong>Similar jobs:</strong>
                  {' '}
                  {response.initialDiscovery.similarJobs?.join(', ') || 'None'}
                </div>
                <div>
                  <strong>Hits empty?</strong>
                  {' '}
                  {response.initialDiscovery.hits.length === 0 ? (
                    <Badge variant="warning">YES - May indicate overly specific query or no data</Badge>
                  ) : (
                    <Badge variant="success">NO - {response.initialDiscovery.hits.length} hits returned</Badge>
                  )}
                </div>
              </div>
              <div className="small mb-2">
                <Badge variant="primary" className="mr-2">Stage 2: Matched Selections</Badge>
                <div>Skills: {response.matchedFacetSelections['skills.name'].join(', ') || 'None'}</div>
                <div>Industries: {response.matchedFacetSelections.industry_names.join(', ') || 'None'}</div>
                <div>Job Sources: {response.matchedFacetSelections.job_sources.join(', ') || 'None'}</div>
              </div>
              <div className="small">
                <Badge variant="info" className="mr-2">Stage 3: Refined Discovery</Badge>
                <span>Hits Found: {response.refinedDiscovery.totalHits}</span>
                <div>
                  <strong>Refined request query:</strong>
                  {' '}
                  {response.matchedFacetSelections
                     && Object.values(response.matchedFacetSelections).some(arr => arr.length > 0)
                    ? response.intake.condensedQuery
                    : '(no refinements applied, refined request skipped)'}
                </div>
              </div>
              <div className="small mt-2">
                <Badge variant="success" className="mr-2">Profile</Badge>
                <span>Created: {response.learnerProfile ? 'yes' : 'no'}</span>
              </div>
            </div>
          )}

          <DataTable
            itemCount={3}
            data={[
              {
                facet: 'Skills',
                count: filters['skills.name'].items.length,
                top: filters['skills.name'].items.slice(0, 3).map(f => f.label).join(', '),
              },
              {
                facet: 'Industries',
                count: filters.industry_names.items.length,
                top: filters.industry_names.items.slice(0, 3).map(f => f.label).join(', '),
              },
              {
                facet: 'Job Sources',
                count: filters.job_sources.items.length,
                top: filters.job_sources.items.slice(0, 3).map(f => f.label).join(', '),
              },
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
            <summary className="small text-primary cursor-pointer">View Raw JSON (Universe + Selections)</summary>
            <pre className="x-small bg-light p-2 mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {JSON.stringify({ filters, response }, null, 2)}
            </pre>
          </details>
        </>
      )}
    </Card.Body>
  </Card>
);
