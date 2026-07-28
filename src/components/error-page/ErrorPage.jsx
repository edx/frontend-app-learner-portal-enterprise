import PropTypes from 'prop-types';
import { Col } from '@openedx/paragon';
import { Helmet } from 'react-helmet';

import { FooterSlot } from '@edx/frontend-component-footer';
import { useIntl } from '@edx/frontend-platform/i18n';

import ErrorPageHeader from './ErrorPageHeader';
import ErrorPageTitle from './ErrorPageTitle';
import ErrorPageSubtitle from './ErrorPageSubtitle';
import ErrorPageContent from './ErrorPageContent';
import messages from './messages';

/**
 * React component for the error case when attempting to link a user to a customer. Renders
 * a header, error alert, and a footer.
 */
const ErrorPage = ({
  title,
  titleClassName,
  spannedTitle,
  subtitle,
  showSiteHeader,
  showSiteFooter,
  children,
  errorPageContentClassName,
  testId,
  includeHelmet,
  imageSrc,
}) => {
  const intl = useIntl();
  // `title` cannot be defaulted via `defaultProps` since the fallback copy must be
  // translated, which requires the `useIntl` hook. An explicitly passed `null` still
  // suppresses the title, as before.
  const resolvedTitle = title === undefined ? intl.formatMessage(messages.defaultTitle) : title;

  return (
    <>
      {includeHelmet && <Helmet title={intl.formatMessage(messages.helmetTitle)} />}
      {showSiteHeader && <ErrorPageHeader />}
      <main id="content" className="fill-vertical-space" data-testid={testId}>
        <ErrorPageContent className={errorPageContentClassName}>
          <Col xs={12} lg={{ span: 10, offset: 1 }}>
            {imageSrc && (
              <img
                src={imageSrc}
                alt="" // image is decorative only; not pertinent to screen readers.
                className="mb-4.5"
              />
            )}
            {resolvedTitle && (
              <ErrorPageTitle
                className={titleClassName}
                spannedTitle={spannedTitle}
              >
                {resolvedTitle}
              </ErrorPageTitle>
            )}
            {subtitle && (
              <ErrorPageSubtitle>{subtitle}</ErrorPageSubtitle>
            )}
            {children}
          </Col>
        </ErrorPageContent>
      </main>
      {showSiteFooter && <FooterSlot />}
    </>
  );
};

ErrorPage.Content = ErrorPageContent;
ErrorPage.Title = ErrorPageTitle;
ErrorPage.Subtitle = ErrorPageSubtitle;

ErrorPage.propTypes = {
  showSiteHeader: PropTypes.bool,
  children: PropTypes.node.isRequired,
  title: PropTypes.node,
  spannedTitle: PropTypes.node,
  titleClassName: PropTypes.string,
  subtitle: PropTypes.node,
  showSiteFooter: PropTypes.bool,
  errorPageContentClassName: PropTypes.string,
  testId: PropTypes.string,
  includeHelmet: PropTypes.bool,
  imageSrc: PropTypes.string,
};

ErrorPage.defaultProps = {
  // Resolved to a translated default within the component; see `resolvedTitle`.
  title: undefined,
  spannedTitle: null,
  titleClassName: undefined,
  subtitle: null,
  showSiteHeader: true,
  showSiteFooter: true,
  errorPageContentClassName: undefined,
  testId: undefined,
  includeHelmet: false,
  imageSrc: undefined,
};

export default ErrorPage;
