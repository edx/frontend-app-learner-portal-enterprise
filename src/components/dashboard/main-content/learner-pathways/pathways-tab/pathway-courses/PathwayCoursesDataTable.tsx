import React, { useMemo } from 'react';
import { Badge, Card, DataTable } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { PathwayCourse } from '../state';
import PathwayCourseStatusBadge from './PathwayCourseStatusBadge';
import PathwayCourseActionButton from './PathwayCourseActionButton';
import messages from './messages';

export interface PathwayCoursesDataTableProps {
  courses: PathwayCourse[];
}

interface PathwayCourseRow {
  row: { original: PathwayCourse };
}

const StatusCell = ({ row }: PathwayCourseRow) => (
  <PathwayCourseStatusBadge status={row.original.status} />
);

const CourseCell = ({ row }: PathwayCourseRow) => (
  <span className="font-weight-bold mb-0">{row.original.title}</span>
);

const LevelCell = ({ row }: PathwayCourseRow) => (
  row.original.level ? <Badge variant="light">{row.original.level}</Badge> : null
);

const WhyThisFitsYouCell = ({ row }: PathwayCourseRow) => {
  const intl = useIntl();
  return (
    <p className={row.original.whyThisFitsYou ? 'small mb-0' : 'small text-muted mb-0'}>
      {row.original.whyThisFitsYou || intl.formatMessage(messages.notAvailable)}
    </p>
  );
};

const LengthCell = ({ row }: PathwayCourseRow) => {
  const intl = useIntl();
  return row.original.length ? (
    <span>{row.original.length}</span>
  ) : (
    <span className="text-muted">{intl.formatMessage(messages.notAvailable)}</span>
  );
};

const ActionCell = ({ row }: PathwayCourseRow) => (
  <PathwayCourseActionButton course={row.original} />
);

const getPathwayCoursesColumns = (intl: ReturnType<typeof useIntl>) => [
  {
    Header: intl.formatMessage(messages.statusColumn),
    accessor: 'status',
    Cell: StatusCell,
  },
  {
    Header: intl.formatMessage(messages.courseColumn),
    accessor: 'title',
    Cell: CourseCell,
  },
  {
    Header: intl.formatMessage(messages.levelColumn),
    accessor: 'level',
    Cell: LevelCell,
  },
  {
    Header: intl.formatMessage(messages.whyThisFitsYouColumn),
    accessor: 'whyThisFitsYou',
    Cell: WhyThisFitsYouCell,
  },
  {
    Header: intl.formatMessage(messages.lengthColumn),
    accessor: 'length',
    Cell: LengthCell,
  },
  {
    Header: intl.formatMessage(messages.actionColumn),
    accessor: 'courseKey',
    Cell: ActionCell,
  },
];

const PathwayCoursesDataTable = ({ courses }: PathwayCoursesDataTableProps) => {
  const intl = useIntl();
  const columns = useMemo(() => getPathwayCoursesColumns(intl), [intl]);

  return (
    <Card className="shadow-sm">
      <DataTable columns={columns} data={courses} itemCount={courses.length}>
        <DataTable.Table />
      </DataTable>
    </Card>
  );
};

export default PathwayCoursesDataTable;
