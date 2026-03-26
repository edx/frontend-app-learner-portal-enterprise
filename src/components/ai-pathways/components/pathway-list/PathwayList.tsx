import React, { useMemo } from 'react';
import {
  Button,
  Badge,
  Row,
  Col,
} from '@openedx/paragon';
import { Edit } from '@openedx/paragon/icons';
import type { LearningPathway, CourseStatus, PathwayCourse } from '../../services/pathways.types';
import { PrototypeCard } from '../PrototypeCard';
import { PathwayFilters } from '../pathway-filters/PathwayFilters';
import { PathwayDetail } from '../pathway-detail/PathwayDetail';
import { usePathwayFilters } from '../../hooks/usePathwayFilters';
import { usePathwayDetail } from '../../hooks/usePathwayDetail';

interface PathwayListProps {
  pathway: LearningPathway;
  onAdjustPathway?: () => void;
}

/**
 * Returns a Paragon badge variant for a given course status.
 */
const getStatusVariant = (status: CourseStatus): 'success' | 'warning' | 'info' | 'light' => {
  switch (status) {
    case 'completed': return 'success';
    case 'in progress': return 'warning';
    case 'not started': return 'info';
    default: return 'light';
  }
};

/**
 * PathwayList component renders the course roadmap for a generated learning pathway.
 *
 * It provides a header with summary statistics and a detailed table of recommended courses.
 * This component is a Paragon-based migration of the source app's Pathway component.
 */
export const PathwayList = ({ pathway, onAdjustPathway }: PathwayListProps) => {
  const { courses } = pathway;

  const {
    filteredAndSortedCourses,
    filters,
    handlers,
  } = usePathwayFilters({ courses });

  const {
    selectedCourse,
    isDetailOpen,
    openDetail,
    closeDetail,
  } = usePathwayDetail();

  const stats = useMemo(() => {
    const totalCompleted = courses.filter((c) => c.status === 'completed').length;
    const totalInProgress = courses.filter((c) => c.status === 'in progress').length;
    const totalUpcoming = courses.filter((c) => c.status === 'not started').length;

    return {
      totalCompleted,
      totalInProgress,
      totalUpcoming,
      totalCourses: courses.length + 1, // Preserving source app's +1 logic
    };
  }, [courses]);

  return (
    <div className="pathway-list">
      <PrototypeCard className="mb-4">
        <header className="text-center mb-4">
          <h2 className="h3 mb-2">Your Personalized Learning Pathway</h2>
          <p className="text-muted mb-4">
            Based on your goals and background, here are the courses we recommend.
            Track your progress below as you complete each one.
          </p>
          <Button
            variant="outline-primary"
            onClick={onAdjustPathway}
            iconBefore={Edit}
          >
            Adjust My Pathway
          </Button>
        </header>

        <hr className="my-4" />

        <Row className="text-center py-3">
          <Col xs={6} md={3} className="mb-3 mb-md-0">
            <div className="h1 font-weight-bold text-primary mb-0">{stats.totalCompleted}</div>
            <div className="small text-muted text-uppercase font-weight-bold">Completed</div>
          </Col>
          <Col xs={6} md={3} className="mb-3 mb-md-0">
            <div className="h1 font-weight-bold text-primary mb-0">{stats.totalInProgress}</div>
            <div className="small text-muted text-uppercase font-weight-bold">In Progress</div>
          </Col>
          <Col xs={6} md={3}>
            <div className="h1 font-weight-bold text-primary mb-0">{stats.totalUpcoming}</div>
            <div className="small text-muted text-uppercase font-weight-bold">Upcoming</div>
          </Col>
          <Col xs={6} md={3}>
            <div className="h1 font-weight-bold text-primary mb-0">{stats.totalCourses}</div>
            <div className="small text-muted text-uppercase font-weight-bold">Total Courses</div>
          </Col>
        </Row>

        <hr className="my-4" />

        <PathwayFilters
          {...filters}
          onSearchChange={handlers.setSearchQuery}
          onStatusChange={handlers.setStatusFilter}
          onLevelChange={handlers.setLevelFilter}
          onSortKeyChange={handlers.setSortKey}
          onSortOrderChange={handlers.setSortOrder}
          onReset={handlers.resetFilters}
        />

        {filteredAndSortedCourses.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-muted">No courses match your selected filters.</p>
            <Button variant="link" onClick={handlers.resetFilters}>Clear all filters</Button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr className="text-uppercase small font-weight-bold text-muted">
                  <th className="border-top-0">Status</th>
                  <th className="border-top-0" style={{ minWidth: '200px' }}>Course</th>
                  <th className="border-top-0">Level</th>
                  <th className="border-top-0" style={{ minWidth: '250px' }}>Why This Fits You</th>
                  <th className="border-top-0">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedCourses.map((course) => {
                  const actionText = course.status === 'completed'
                    ? 'View Certificate'
                    : course.status === 'in progress'
                      ? 'Continue Course'
                      : 'Register';

                  return (
                    <tr key={`${course.title}-${course.order}`}>
                      <td>
                        <Badge variant={getStatusVariant(course.status)}>
                          {course.status}
                        </Badge>
                      </td>
                      <td>
                        <div className="font-weight-bold mb-1">{course.title}</div>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-primary d-flex align-items-center"
                          style={{ fontSize: '13px', textDecoration: 'underline' }}
                          onClick={() => openDetail(course)}
                        >
                          View Details
                        </Button>
                      </td>
                      <td>
                        <Badge variant="info" className="text-uppercase" style={{ backgroundColor: '#EBF5FB', color: '#3498DB' }}>
                          {course.level}
                        </Badge>
                      </td>
                      <td>
                        <p className="small mb-0 text-dark" style={{ lineHeight: '1.5' }}>
                          {course.reasoning}
                        </p>
                      </td>
                      <td>
                        <Button
                          variant={course.status === 'completed' ? 'success' : 'primary'}
                          size="sm"
                          className="font-weight-bold text-nowrap"
                          style={{
                            background: course.status !== 'completed'
                              ? 'linear-gradient(135deg, #3498DB, #9B59B6)'
                              : undefined,
                            border: 'none',
                          }}
                        >
                          {actionText}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PrototypeCard>

      <PathwayDetail
        course={selectedCourse}
        isOpen={isDetailOpen}
        onClose={closeDetail}
        onAction={(course: PathwayCourse) => {
          console.log('Action performed on course:', course.title);
          // In a real app, this might navigate to the course or open a registration flow.
        }}
      />
    </div>
  );
};
