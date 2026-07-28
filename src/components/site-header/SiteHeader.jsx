import { HashLink } from 'react-router-hash-link';
import { getConfig } from '@edx/frontend-platform/config';
import { MenuIcon } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Container, MediaQuery } from '@openedx/paragon';

import SiteHeaderLogos from './SiteHeaderLogos';
import SiteHeaderNavMenu from './SiteHeaderNavMenu';
import { Menu, MenuTrigger, MenuContent } from './menu';
import AvatarDropdown from './AvatarDropdown';

const SiteHeader = () => {
  const config = getConfig();
  const intl = useIntl();

  // Shared across the desktop and mobile headers, which both label their main
  // navigation landmark identically.
  const mainNavLabel = intl.formatMessage({
    id: 'site.header.nav.main.ariaLabel',
    defaultMessage: 'Main',
    description: 'Accessible label for the main navigation landmark in the site header.',
  });

  const renderDesktopHeader = () => (
    <header className="site-header-desktop">
      <Container size="lg">
        <div className="nav-container position-relative d-flex align-items-center">
          <SiteHeaderLogos />
          <nav aria-label={mainNavLabel} className="nav main-nav">
            <SiteHeaderNavMenu />
          </nav>
          <nav
            aria-label={intl.formatMessage({
              id: 'site.header.nav.secondary.ariaLabel',
              defaultMessage: 'Secondary',
              description: 'Accessible label for the secondary navigation landmark in the site header.',
            })}
            className="nav secondary-menu-container align-items-center ml-auto"
          >
            <a href={config.LEARNER_SUPPORT_URL} className="text-gray-700 mr-3">
              {intl.formatMessage({
                id: 'site.header.nav.help.title',
                defaultMessage: 'Help',
                description: 'Help link in site header navigation.',
              })}
            </a>
            <AvatarDropdown />
          </nav>
        </div>
      </Container>
    </header>
  );

  const renderMobileHeader = () => {
    const mainMenuTitle = intl.formatMessage({
      id: 'site.header.nav.mainMenu.title',
      defaultMessage: 'Main Menu',
      description: 'Accessible label and tooltip for the button that opens the main navigation menu on mobile.',
    });
    return (
      <header
        aria-label={mainNavLabel}
        className="site-header-mobile d-flex justify-content-between align-items-center shadow"
      >
        <div className="w-100 d-flex justify-content-start">
          <Menu className="position-static">
            <MenuTrigger
              tag="button"
              className="icon-button"
              aria-label={mainMenuTitle}
              title={mainMenuTitle}
            >
              <MenuIcon role="img" aria-hidden focusable="false" style={{ width: '1.5rem', height: '1.5rem' }} />
            </MenuTrigger>
            <MenuContent
              tag="nav"
              aria-label={mainNavLabel}
              className="nav flex-column pin-left pin-right border-top shadow py-2"
            >
              <SiteHeaderNavMenu />
            </MenuContent>
          </Menu>
        </div>
        <div className="w-100 d-flex justify-content-center">
          <SiteHeaderLogos />
        </div>
        <div className="w-100 d-flex justify-content-end">
          <AvatarDropdown showLabel={false} />
        </div>
      </header>
    );
  };

  return (
    <>
      <div className="position-absolute">
        <HashLink to="#content" className="skip-nav-link sr-only sr-only-focusable btn btn-primary mt-3 ml-2">
          {intl.formatMessage({
            id: 'site.header.skipToMainContent',
            defaultMessage: 'Skip to main content',
            description: 'Label for the link, visible only to keyboard and screen reader users, that jumps past the navigation to the page content.',
          })}
        </HashLink>
      </div>
      <MediaQuery maxWidth={768}>
        {renderMobileHeader()}
      </MediaQuery>
      <MediaQuery minWidth={769}>
        {renderDesktopHeader()}
      </MediaQuery>
    </>
  );
};

export default SiteHeader;
