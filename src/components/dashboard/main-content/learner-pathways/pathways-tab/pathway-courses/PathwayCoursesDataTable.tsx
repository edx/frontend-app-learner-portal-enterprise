import React, { useMemo } from 'react';
import { Badge, Card, DataTable } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import PathwayCourseStatusBadge from './PathwayCourseStatusBadge';
import PathwayCourseActionButton from './PathwayCourseActionButton';
import messages from './messages';
import type { ResolvedPathwayCourse } from './resolvePathwayCourses';

export interface PathwayCoursesDataTableProps {
  courses: ResolvedPathwayCourse[];
}

interface PathwayCourseRow {
  row: { original: ResolvedPathwayCourse };
}

const StatusCell = ({ row }: PathwayCourseRow) => (
  <PathwayCourseStatusBadge status={row.original.status} />
);

const CourseCell = ({ row }: PathwayCourseRow) => (
  <span className="font-weight-bold mb-0">{row.original.title}</span>
);

const LevelCell = ({ row }: PathwayCourseRow) => (
  row.original.level ? <Badge variant="light" className="font-weight-light p-2">{row.original.level}</Badge> : null
);

const WhyThisFitsYouCell = ({ row }: PathwayCourseRow) => {
  const intl = useIntl();
  return (
    <p className={row.original.whyThisFitsYou ? 'small mb-0' : 'small text-muted mb-0'}>
      {row.original.whyThisFitsYou || intl.formatMessage(messages.notAvailable)}
    </p>
  );
};

// TODO: Determine why length is not being serialized into Algolia
// const LengthCell = ({ row }: PathwayCourseRow) => {
//   const intl = useIntl();
//   return row.original.length ? (
//     <span>{row.original.length}</span>
//   ) : (
//     <span className="text-muted">{intl.formatMessage(messages.notAvailable)}</span>
//   );
// };

const ActionCell = ({ row }: PathwayCourseRow) => (
  <PathwayCourseActionButton action={row.original.action} courseTitle={row.original.title} />
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
  // TODO: Fix this, Commented out as none of the lengths are being serialized from Algolia
  // {
  //   Header: intl.formatMessage(messages.lengthColumn),
  //   accessor: 'length',
  //   Cell: LengthCell,
  // },
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
