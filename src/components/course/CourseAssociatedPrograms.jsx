import React, { useContext } from 'react';

import { CourseContext } from './CourseContextProvider';

import { getProgramIcon, formatProgramType } from './data/utils';

export default function CourseAssociatedPrograms() {
  const { state } = useContext(CourseContext);
  const { course } = state;

  return (
    <div className="associated-programs mb-5">
      <h3>Associated Programs</h3>
      <ul className="pl-0 list-unstyled">
        {course.programs.map(program => (
          <li key={program.uuid} className="mb-3 row">
            <div className="col d-flex">
              <div className="program-icon" aria-hidden="true">
                <img
                  src={getProgramIcon(program.type)}
                  alt={program.title}
                  className="program-icon mr-2"
                  style={{ width: 20, height: 20 }}
                />
              </div>
              <div>
                {formatProgramType(program.type)}
              </div>
            </div>
            <div className="col">
              <a href={program.marketingUrl}>
                {program.title}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
