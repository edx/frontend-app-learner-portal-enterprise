import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { getConfig } from '@edx/frontend-platform/config';
import { AppContext } from '@edx/frontend-platform/react';
import { AvatarButton, Dropdown } from '@edx/paragon';

const AvatarDropdown = ({ showLabel }) => {
  const { BASE_URL, LMS_BASE_URL, LOGOUT_URL } = getConfig();
  const { enterpriseConfig, authenticatedUser } = useContext(AppContext);
  const { username, profileImage } = authenticatedUser;
  const dashboardLink = `/${enterpriseConfig.slug}`;
  return (
    <Dropdown>
      <Dropdown.Toggle showLabel={showLabel} as={AvatarButton} src={profileImage.imageUrlMedium}>
        {username}
      </Dropdown.Toggle>
      <Dropdown.Menu alignRight>
        <Dropdown.Header className="text-uppercase">Select dashboard</Dropdown.Header>
        <Dropdown.Item href={`${LMS_BASE_URL}/dashboard`}>Personal</Dropdown.Item>
        <Dropdown.Item as={NavLink} to={dashboardLink}>Enterprise</Dropdown.Item>
        <Dropdown.Divider className="border-light" />
        <Dropdown.Item href={`${LMS_BASE_URL}/u/${authenticatedUser.username}`}>My Profile</Dropdown.Item>
        <Dropdown.Item href={`${LMS_BASE_URL}/account/settings`}>Account Settings</Dropdown.Item>
        <Dropdown.Item href="https://support.edx.org/hc/en-us">Help</Dropdown.Item>
        <Dropdown.Divider className="border-light" />
        <Dropdown.Item href={`${LOGOUT_URL}?next=${BASE_URL}${dashboardLink}`}>Sign out</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

AvatarDropdown.propTypes = {
  showLabel: PropTypes.bool,
};

AvatarDropdown.defaultProps = {
  showLabel: true,
};

export default AvatarDropdown;
