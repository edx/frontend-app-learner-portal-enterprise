import { Container, Stack } from '@openedx/paragon';

import InitialStateActionButton from './components/InitialStateActionButton';
import InitialStateBody from './components/InitialStateBody';
import InitialStateHeader from './components/InitialStateHeader';

/**
 * Root renderer for the Learner Pathways initial state.
 * It composes abstracted header/body/button sections and intentionally keeps
 * this scaffold stateless until dedicated state-management work lands.
 */
const LearnerPathwaysTabInitialState = () => (
  <section data-testid="learner-pathways-tab-initial-state" className="mt-4 mb-5">
    <Container fluid className="px-0">
      <Stack gap={4}>
        <InitialStateHeader />
        <InitialStateBody />
        <InitialStateActionButton />
      </Stack>
    </Container>
  </section>
);

export default LearnerPathwaysTabInitialState;
