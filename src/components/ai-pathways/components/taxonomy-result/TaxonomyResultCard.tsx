import React from 'react';
import {
  Card, Badge, Row, Col, Icon,
} from '@openedx/paragon';
import { Assignment, MonetizationOn } from '@openedx/paragon/icons';
import { TaxonomyResult } from '../../types';

interface TaxonomyResultCardProps {
  result: TaxonomyResult;
  className?: string;
}

/**
 * TaxonomyResultCard displays a career role or job from the taxonomy index.
 * It focuses on skills, industries, and market data (salary/demand).
 */
export const TaxonomyResultCard = ({
  result,
  className = '',
}: TaxonomyResultCardProps) => {
  const {
    title,
    description,
    skills,
    industries,
    marketData,
    reasoning,
  } = result;

  return (
    <Card className={`h-100 ${className}`}>
      <Card.Body className="d-flex flex-column">
        <header className="mb-3">
          <div className="d-flex justify-content-between align-items-start mb-1">
            <Badge variant="primary" className="text-uppercase">Career Role</Badge>
            {marketData?.uniquePostings && (
              <Badge variant="info">High Demand</Badge>
            )}
          </div>
          <h4 className="h5 font-weight-bold mb-1">{title}</h4>
          <div className="text-muted small">
            {industries.slice(0, 2).join(' • ')}
          </div>
        </header>

        <section className="mb-3 flex-grow-1">
          <p
            className="small text-muted"
            style={{
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {description}
          </p>
          {reasoning && (
            <div className="bg-light p-2 rounded small border-left border-primary">
              <strong>AI Match:</strong> {reasoning}
            </div>
          )}
        </section>

        <section className="mb-3">
          <h6 className="small font-weight-bold text-uppercase mb-2">Top Skills</h6>
          <div className="d-flex flex-wrap gap-1">
            {skills.slice(0, 5).map((skill) => (
              <Badge key={skill.name} variant="light" className="mr-1 mb-1 border" style={{ fontWeight: 'normal' }}>
                {skill.name}
              </Badge>
            ))}
          </div>
        </section>

        {marketData && (
          <Row className="no-gutters border-top pt-3 mt-auto align-items-center">
            <Col xs={6} className="d-flex align-items-center">
              <Icon src={MonetizationOn} className="mr-2 text-success" />
              <div>
                <div className="small text-muted font-weight-bold">Median Salary</div>
                <div className="h6 mb-0">${marketData.medianSalary?.toLocaleString() || 'N/A'}</div>
              </div>
            </Col>
            <Col xs={6} className="d-flex align-items-center border-left pl-3">
              <Icon src={Assignment} className="mr-2 text-info" />
              <div>
                <div className="small text-muted font-weight-bold">Postings</div>
                <div className="h6 mb-0">{marketData.uniquePostings?.toLocaleString() || 'N/A'}</div>
              </div>
            </Col>
          </Row>
        )}
      </Card.Body>
    </Card>
  );
};
