import PropTypes from 'prop-types';
import { defineMessages, FormattedMessage } from '@edx/frontend-platform/i18n';
import { Button } from '@openedx/paragon';

import { DASHBOARD_COURSES_TAB } from '../data/constants';

const messages = defineMessages({
  heroTitle: {
    id: 'enterprise.dashboard.pathways.learnerPathways.heroTitle',
    defaultMessage: 'Build your personalized pathway!',
    description: 'Learner pathways tab scaffold hero heading.',
  },
  heroBody: {
    id: 'enterprise.dashboard.pathways.learnerPathways.heroBody',
    defaultMessage: 'A personalized pathway helps you achieve your goals. Start with onboarding, review your profile, then continue to your pathway.',
    description: 'Learner pathways tab scaffold hero description.',
  },
  stageOnboarding: {
    id: 'enterprise.dashboard.pathways.learnerPathways.stage.onboarding',
    defaultMessage: 'Onboarding quiz',
    description: 'Learner pathways scaffold stage label.',
  },
  stageProfile: {
    id: 'enterprise.dashboard.pathways.learnerPathways.stage.profile',
    defaultMessage: 'Review your profile',
    description: 'Learner pathways scaffold stage label.',
  },
  stagePathway: {
    id: 'enterprise.dashboard.pathways.learnerPathways.stage.pathway',
    defaultMessage: 'Start your pathway',
    description: 'Learner pathways scaffold stage label.',
  },
  startOnboarding: {
    id: 'enterprise.dashboard.pathways.learnerPathways.action.startOnboarding',
    defaultMessage: 'Start pathway onboarding',
    description: 'Learner pathways scaffold action to start onboarding.',
  },
  skipToCourses: {
    id: 'enterprise.dashboard.pathways.learnerPathways.action.skipToCourses',
    defaultMessage: 'Skip and go to Courses tab',
    description: 'Learner pathways scaffold action to go back to courses tab.',
  },
  profileTitle: {
    id: 'enterprise.dashboard.pathways.learnerPathways.profile.title',
    defaultMessage: 'Your pathway profile',
    description: 'Learner pathways scaffold profile section title.',
  },
  profileBody: {
    id: 'enterprise.dashboard.pathways.learnerPathways.profile.body',
    defaultMessage: 'Profile placeholder: this area will show a generated learner profile based on onboarding responses.',
    description: 'Learner pathways scaffold profile placeholder body.',
  },
  generatePathway: {
    id: 'enterprise.dashboard.pathways.learnerPathways.action.generatePathway',
    defaultMessage: 'Generate pathway',
    description: 'Learner pathways scaffold action for pathway generation placeholder.',
  },
  pathwayTitle: {
    id: 'enterprise.dashboard.pathways.learnerPathways.pathway.title',
    defaultMessage: 'Pathway',
    description: 'Learner pathways scaffold pathway section title.',
  },
  pathwayBody: {
    id: 'enterprise.dashboard.pathways.learnerPathways.pathway.body',
    defaultMessage: 'Pathway experience placeholder: recommended courses and progression will render here in later iterations.',
    description: 'Learner pathways scaffold pathway placeholder body.',
  },
});

const LearnerPathwaysTab = ({ onSelectTab }) => (
  <div data-testid="learner-pathways-tab-scaffold" className="mt-4">
    <section data-testid="learner-pathways-entry-section" className="mb-4">
      <h3>
        <FormattedMessage {...messages.heroTitle} />
      </h3>
      <p>
        <FormattedMessage {...messages.heroBody} />
      </p>
      <div className="mb-3">
        <span className="mr-3"><FormattedMessage {...messages.stageOnboarding} /></span>
        <span className="mr-3"><FormattedMessage {...messages.stageProfile} /></span>
        <span><FormattedMessage {...messages.stagePathway} /></span>
      </div>
      <Button data-testid="learner-pathways-action-start-onboarding">
        <FormattedMessage {...messages.startOnboarding} />
      </Button>
      <Button
        variant="tertiary"
        className="ml-2"
        data-testid="learner-pathways-action-skip-courses"
        onClick={() => onSelectTab(DASHBOARD_COURSES_TAB)}
      >
        <FormattedMessage {...messages.skipToCourses} />
      </Button>
    </section>

    <section data-testid="learner-pathways-profile-section" className="mb-4">
      <h4>
        <FormattedMessage {...messages.profileTitle} />
      </h4>
      <p>
        <FormattedMessage {...messages.profileBody} />
      </p>
      <Button data-testid="learner-pathways-action-generate-pathway">
        <FormattedMessage {...messages.generatePathway} />
      </Button>
    </section>

    <section data-testid="learner-pathways-pathway-section">
      <h4>
        <FormattedMessage {...messages.pathwayTitle} />
      </h4>
      <p>
        <FormattedMessage {...messages.pathwayBody} />
      </p>
    </section>
  </div>
);

LearnerPathwaysTab.propTypes = {
  onSelectTab: PropTypes.func.isRequired,
};

export default LearnerPathwaysTab;
