import { Alert } from '@openedx/paragon';

import type { InsightProps } from '../core/stream/types';

const InsightBlock = ({ title, body }: InsightProps) => (
  <Alert variant="info" className="personalized-search__insight mb-0">
    <Alert.Heading as="h3" className="h5">{title}</Alert.Heading>
    <p className="mb-0">{body}</p>
  </Alert>
);

export default InsightBlock;
