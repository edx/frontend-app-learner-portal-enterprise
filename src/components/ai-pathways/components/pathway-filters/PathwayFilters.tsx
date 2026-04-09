import React from 'react';
import {
  Row,
  Col,
  Form,
  SearchField,
  Button,
} from '@openedx/paragon';
import { Close } from '@openedx/paragon/icons';
import type { CourseStatus } from '../../types';
import type { SortKey, SortOrder } from '../../hooks/usePathwayFilters';

interface PathwayFiltersProps {
  searchQuery: string;
  statusFilter: CourseStatus | 'all';
  levelFilter: string | 'all';
  sortKey: SortKey;
  sortOrder: SortOrder;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: CourseStatus | 'all') => void;
  onLevelChange: (level: string | 'all') => void;
  onSortKeyChange: (key: SortKey) => void;
  onSortOrderChange: (order: SortOrder) => void;
  onReset: () => void;
}

/**
 * PathwayFilters component provides UI controls for filtering and sorting the pathway course list.
 *
 * It uses Paragon's SearchField and Form components for consistent design.
 */
export const PathwayFilters = ({
  searchQuery,
  statusFilter,
  levelFilter,
  sortKey,
  sortOrder,
  onSearchChange,
  onStatusChange,
  onLevelChange,
  onSortKeyChange,
  onSortOrderChange,
  onReset,
}: PathwayFiltersProps) => (
  <div className="pathway-filters mb-4 p-3 bg-light rounded shadow-sm">
    <Row className="align-items-end">
      <Col xs={12} lg={4} className="mb-3 mb-lg-0">
        <SearchField
          label="Search Courses"
          placeholder="Filter by title or reasoning..."
          value={searchQuery}
          onChange={onSearchChange}
          onClear={() => onSearchChange('')}
        />
      </Col>

      <Col xs={6} md={3} lg={2} className="mb-3 mb-md-0">
        <Form.Group controlId="statusFilter">
          <Form.Label className="small font-weight-bold">Status</Form.Label>
          <Form.Control
            as="select"
            size="sm"
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onStatusChange(e.target.value as CourseStatus | 'all')}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in progress">In Progress</option>
            <option value="not started">Not Started</option>
          </Form.Control>
        </Form.Group>
      </Col>

      <Col xs={6} md={3} lg={2} className="mb-3 mb-md-0">
        <Form.Group controlId="levelFilter">
          <Form.Label className="small font-weight-bold">Level</Form.Label>
          <Form.Control
            as="select"
            size="sm"
            value={levelFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onLevelChange(e.target.value)}
          >
            <option value="all">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </Form.Control>
        </Form.Group>
      </Col>

      <Col xs={6} md={3} lg={2} className="mb-3 mb-md-0">
        <Form.Group controlId="sortKey">
          <Form.Label className="small font-weight-bold">Sort By</Form.Label>
          <Form.Control
            as="select"
            size="sm"
            value={`${sortKey}-${sortOrder}`}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const [key, order] = e.target.value.split('-') as [SortKey, SortOrder];
              onSortKeyChange(key);
              onSortOrderChange(order);
            }}
          >
            <option value="order-asc">Order (Asc)</option>
            <option value="order-desc">Order (Desc)</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="level-asc">Level (Asc)</option>
            <option value="level-desc">Level (Desc)</option>
          </Form.Control>
        </Form.Group>
      </Col>

      <Col xs={6} md={3} lg={2} className="text-right">
        <Button
          variant="link"
          size="sm"
          onClick={onReset}
          iconBefore={Close}
          className="text-muted p-0"
        >
          Reset Filters
        </Button>
      </Col>
    </Row>
  </div>
);
