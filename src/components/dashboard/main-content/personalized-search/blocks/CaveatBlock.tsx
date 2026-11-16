import { Alert } from '@openedx/paragon';
import { WarningFilled } from '@openedx/paragon/icons';

import type { CaveatProps } from '../core/stream/types';

/** A visible warning when the results can't meet a goal the learner stated, e.g. a full qualification. */
const CaveatBlock = ({ title, body }: CaveatProps) => (
  <Alert variant="warning" icon={WarningFilled} className="mb-0 personalized-search__caveat">
    <Alert.Heading>{title}</Alert.Heading>
    <p className="mb-0">{body}</p>
  </Alert>
);

export default CaveatBlock;
