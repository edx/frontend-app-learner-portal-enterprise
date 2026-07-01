import React from 'react';
import { Badge, Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { PathwayCourse, PathwayProgress } from '../state';
import PathwayProgressCard from './PathwayProgressCard';
import PathwayCoursesDataTable from './PathwayCoursesDataTable';
import messages from './messages';

export interface PathwayCoursesPageProps {
  courses: PathwayCourse[];
  progress: PathwayProgress;
}

/**
 * Owns page *content* only. `LearnerPathwaysTab` already owns the page-level
 * `Container` for this tab, so this component intentionally does not wrap
 * itself in another one. Unlike `CareerSelectionPage`, this page does not
 * constrain its own width (no `mx-auto`/`maxWidth`) — the courses table
 * benefits from the full width the tab's `Container` already provides.
 */
const PathwayCoursesPage = ({ courses, progress }: PathwayCoursesPageProps) => {
  const intl = useIntl();

  return (
    <section data-testid="pathway-container" className="pb-5">
      <Stack gap={4}>
        <header className="text-center">
          <div className="d-flex align-items-center justify-content-center mb-2">
            <h1 className="h2 mb-0">{intl.formatMessage(messages.title)}</h1>
            <Badge variant="info" className="ml-2 text-uppercase font-weight-bold">
              {intl.formatMessage(messages.betaLabel)}
            </Badge>
          </div>
          <p className="text-muted mb-0">{intl.formatMessage(messages.instructions)}</p>
        </header>
        <PathwayProgressCard progress={progress} />
        <PathwayCoursesDataTable courses={courses} />
      </Stack>
    </section>
  );
};

export default PathwayCoursesPage;
