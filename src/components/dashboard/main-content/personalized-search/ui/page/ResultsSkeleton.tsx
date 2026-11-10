import {
  Card, CardGrid, Col, Row, Skeleton,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import { RESULT_COLUMN_SIZES } from '../cards/EditorialItemCard';

export interface ResultsSkeletonProps {
  /** Which regions are still to come, top to bottom. */
  header: boolean;
  topPick: boolean;
  cards: boolean;
}

const SkeletonCard = () => (
  // The same loading card the search page uses (Paragon Card in its loading state).
  <Card isLoading className="h-100">
    <Card.ImageCap src="" srcAlt="" />
    <Card.Header title="" />
    <Card.Section />
  </Card>
);

/**
 * Placeholders for the results regions that haven't streamed in yet, in page order: the headline, the
 * top pick, then a row of cards (compare or a "More options" group). Real blocks replace them top to bottom.
 */
const ResultsSkeleton = ({ header, topPick, cards }: ResultsSkeletonProps) => {
  const intl = useIntl();
  return (
    <div className="personalized-search__skeleton" role="status" aria-live="polite" data-testid="results-skeleton">
      <span className="sr-only">{intl.formatMessage(messages.loadingResults)}</span>
      {header && (
        <div className="mb-4" data-skeleton="header" aria-hidden>
          <Skeleton height={32} width="70%" className="mb-2" />
          <Skeleton count={2} />
        </div>
      )}
      {topPick && (
        <Row className="bg-light-300 rounded mx-0 py-3 mb-4" data-skeleton="top-pick" aria-hidden>
          <Col {...RESULT_COLUMN_SIZES} className="mb-3 mb-md-0"><SkeletonCard /></Col>
          <Col xs={12} md={6} xl={8}>
            <Skeleton height={24} width="30%" className="mb-2" />
            <Skeleton count={3} />
          </Col>
        </Row>
      )}
      {cards && (
        <div data-skeleton="cards" aria-hidden>
          <Skeleton height={20} width="35%" className="mb-3" />
          <CardGrid columnSizes={RESULT_COLUMN_SIZES}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </CardGrid>
        </div>
      )}
    </div>
  );
};

export default ResultsSkeleton;
