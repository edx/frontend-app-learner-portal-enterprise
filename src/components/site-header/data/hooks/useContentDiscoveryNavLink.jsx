import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { FormattedMessage } from '@edx/frontend-platform/i18n';
import { useAcademies, useCanViewAcademies, useEnterpriseCustomer } from '../../../app/data';

const FindACourseNavLink = ({ enterpriseSlug, className }) => (
  <NavLink to={`/${enterpriseSlug}/search`} className={className}>
    <FormattedMessage
      id="enterprise.dashboard.nav.find.course.title"
      defaultMessage="Find a Course"
      description="Find a course link in site header navigation."
    />
  </NavLink>
);

FindACourseNavLink.propTypes = {
  enterpriseSlug: PropTypes.string.isRequired,
  className: PropTypes.string,
};

FindACourseNavLink.defaultProps = {
  className: undefined,
};

/**
 * Renders the "Go to Academy" link when the customer has exactly one academy, falling back to
 * the "Find a Course" link otherwise. Rendered only for academy-eligible learners so that the
 * academies list is never fetched for ineligible customers.
 */
const SingleAcademyNavLink = ({ enterpriseSlug, className }) => {
  const { data: academies } = useAcademies();

  if (academies.length !== 1) {
    return <FindACourseNavLink enterpriseSlug={enterpriseSlug} className={className} />;
  }

  return (
    <NavLink to={`/${enterpriseSlug}/academies/${academies[0].uuid}`} className={className}>
      <FormattedMessage
        id="enterprise.dashboard.nav.academy.title"
        defaultMessage="Go to Academy"
        description="Go to academy link in site header navigation."
      />
    </NavLink>
  );
};

SingleAcademyNavLink.propTypes = {
  enterpriseSlug: PropTypes.string.isRequired,
  className: PropTypes.string,
};

SingleAcademyNavLink.defaultProps = {
  className: undefined,
};

export default function useContentDiscoveryNavLink(mainMenuLinkClassName) {
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const canViewAcademies = useCanViewAcademies();

  if (canViewAcademies && enterpriseCustomer.enableOneAcademy) {
    return <SingleAcademyNavLink enterpriseSlug={enterpriseCustomer.slug} className={mainMenuLinkClassName} />;
  }
  return <FindACourseNavLink enterpriseSlug={enterpriseCustomer.slug} className={mainMenuLinkClassName} />;
}
