import { Container, Stack } from '@openedx/paragon';

import InitialStateActionButton from './components/InitialStateActionButton';
import InitialStateBody from './components/InitialStateBody';
import InitialStateHeader from './components/InitialStateHeader';

const LearnerPathwaysTabInitialState = ({ onStart }: { onStart?: () => void }) => (
  <section data-testid="learner-pathways-tab-initial-state" className="mt-4 mb-5">
    <Container fluid className="px-0">
      <Stack gap={4}>
        <InitialStateHeader />
        <InitialStateBody />
        <InitialStateActionButton onStart={onStart} />
      </Stack>
    </Container>
  </section>
);

export default LearnerPathwaysTabInitialState;
