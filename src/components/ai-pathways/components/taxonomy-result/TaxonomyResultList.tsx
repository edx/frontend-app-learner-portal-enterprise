import React from 'react';
import { Row, Col, Button } from '@openedx/paragon';
import { Edit } from '@openedx/paragon/icons';
import { TaxonomyResult, TaxonomyFilters } from '../../types';
import { TaxonomyResultCard } from './TaxonomyResultCard';
import { PrototypeCard } from '../PrototypeCard';

interface TaxonomyResultListProps {
  results: TaxonomyResult[];
  filters?: TaxonomyFilters | null;
  onAdjustPathway?: () => void;
}

/**
 * TaxonomyResultList renders a collection of career role discoveries.
 * It also includes a summary of the most relevant skills and industries.
 */
export const TaxonomyResultList = ({
  results,
  filters,
  onAdjustPathway,
}: TaxonomyResultListProps) => {
  return (
    <div className="taxonomy-result-list">
      <PrototypeCard className="mb-4">
        <header className="text-center mb-4">
          <h2 className="h3 mb-2">Career Discovery & Skill Alignment</h2>
          <p className="text-muted mb-4">
            We've identified these roles that align with your background and goals.
            Review the key skills and market demand for each role.
          </p>
          <Button
            variant="outline-primary"
            onClick={onAdjustPathway}
            iconBefore={Edit}
          >
            Adjust My Goals
          </Button>
        </header>

        {filters && (
          <div className="bg-light p-3 rounded mb-4">
            <h6 className="small font-weight-bold text-uppercase mb-3">Refine by Top Skills</h6>
            <div className="d-flex flex-wrap gap-2">
              {filters.skills.slice(0, 10).map((skill, idx) => (
                <Button
                  key={idx}
                  variant="outline-secondary"
                  size="sm"
                  className="mr-2 mb-2 bg-white"
                  style={{ borderRadius: '20px' }}
                >
                  {skill.label} ({skill.count})
                </Button>
              ))}
            </div>
          </div>
        )}

        <Row>
          {results.map((result) => (
            <Col key={result.id} xs={12} md={6} lg={4} className="mb-4">
              <TaxonomyResultCard result={result} />
            </Col>
          ))}
        </Row>

        {results.length === 0 && (
          <div className="text-center py-5">
            <h4 className="text-muted">No matching roles found</h4>
            <p>Try adjusting your goals or skills in the intake form.</p>
          </div>
        )}
      </PrototypeCard>
    </div>
  );
};
