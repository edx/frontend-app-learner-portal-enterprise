import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { Badge, Col, Row } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { CareerMatch, LearnerIntent } from '../state';
import GoalSummaryCard, { type GoalSummaryCardHandle, type GoalSummaryFormValues } from './GoalSummaryCard';
import CareerMatchesCard from './CareerMatchesCard';
import type { OrderedMatch } from './CareerMatchesCard';
import SkillsToDevelopCard from './SkillsToDevelopCard';
import OverwritePathwayModal from './OverwritePathwayModal';
import RetakeQuizModal from './RetakeQuizModal';
import NoPathwayCoursesModal from './NoPathwayCoursesModal';
import { deriveSelectedCareer } from './selectors';
import messages from './messages';
import { RequestErrorAlert } from '../shared';

const MIN_VISIBLE_MATCH_PERCENTAGE = 25;

export interface CareerSelectionPageProps {
  learnerIntent: LearnerIntent;
  careerMatches: CareerMatch[];
  selectedCareerId?: string | null;
  isProfileSubmitting?: boolean;
  isCareerMatchesLoading?: boolean;
  isBuildingPathway?: boolean;
  profileError?: string | null;
  careerMatchesError?: string | null;
  /** Set by CareerSelectionContainer when a build/rebuild attempt fails. */
  pathwayError?: string | null;
  onSubmitGoalSummary: (updates: GoalSummaryFormValues) => Promise<void> | void;
  onSelectCareer: (careerId: string) => void;
  /** Controlled by CareerSelectionContainer (lifted state). */
  isOverwriteOpen: boolean;
  onCloseOverwrite: () => void;
  onConfirmOverwrite: () => Promise<void>;
  /** Ref attached to the portaled build button; used for focus restoration. */
  buildButtonRef: React.RefObject<HTMLButtonElement>;
  /** Controlled by CareerSelectionContainer (lifted state). */
  isRetakeOpen: boolean;
  onCloseRetake: () => void;
  onConfirmRetake: () => void;
  /** Ref attached to the portaled retake-quiz button; used for focus restoration. */
  retakeButtonRef: React.RefObject<HTMLButtonElement>;
  /** Controlled by CareerSelectionContainer; opened when a build/rebuild resolves with no courses. */
  isNoCoursesOpen: boolean;
  onCloseNoCourses: () => void;
  /** Visible skills after user dismissals (computed by container). */
  visibleSkills: string[];
  dismissedSkillCount: number;
  onDismissSkill: (skill: string) => void;
  onRestoreSkills: () => void;
}

const normalizePercentage = (value?: number): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  const normalized = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized)));
};

const CareerSelectionPage = ({
  learnerIntent,
  careerMatches,
  selectedCareerId = null,
  isProfileSubmitting = false,
  isCareerMatchesLoading = false,
  isBuildingPathway = false,
  profileError = null,
  careerMatchesError = null,
  pathwayError = null,
  onSubmitGoalSummary,
  onSelectCareer,
  isOverwriteOpen,
  onCloseOverwrite,
  onConfirmOverwrite,
  buildButtonRef,
  isRetakeOpen,
  onCloseRetake,
  onConfirmRetake,
  retakeButtonRef,
  isNoCoursesOpen,
  onCloseNoCourses,
  visibleSkills,
  dismissedSkillCount,
  onDismissSkill,
  onRestoreSkills,
}: CareerSelectionPageProps) => {
  const intl = useIntl();
  const [isEditing, setIsEditing] = useState(false);
  const goalSummaryCardRef = useRef<GoalSummaryCardHandle>(null);
  // Set when the no-courses modal's primary action opens edit mode, so the focus
  // effect below only fires for that flow and not for a manual "Edit" click.
  const [pendingGoalSummaryFocus, setPendingGoalSummaryFocus] = useState(false);

  useEffect(() => {
    if (isEditing && pendingGoalSummaryFocus) {
      // Deferred a tick: the no-courses modal is unmounting in this same commit, and
      // focusing the field synchronously here can lose a race with that unmount.
      const timeoutId = setTimeout(() => {
        goalSummaryCardRef.current?.focusFirstField();
      }, 0);
      setPendingGoalSummaryFocus(false);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [isEditing, pendingGoalSummaryFocus]);

  const handleEditGoalSummaryFromNoCourses = () => {
    onCloseNoCourses();
    setIsEditing(true);
    setPendingGoalSummaryFocus(true);
  };

  const orderedMatches = useMemo(
    (): OrderedMatch[] => careerMatches
      .map((match) => ({
        match,
        percentage: normalizePercentage(match.matchPercentage),
      }))
      .filter(
        ({ percentage }) => percentage === null || percentage > MIN_VISIBLE_MATCH_PERCENTAGE,
      )
      .sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1)),
    [careerMatches],
  );

  const selectedCareer = useMemo(
    () => deriveSelectedCareer(orderedMatches.map(({ match }) => match), selectedCareerId),
    [orderedMatches, selectedCareerId],
  );

  return (
    <section
      data-testid="profile-container"
      className="mx-auto pb-5"
      style={{ maxWidth: '900px' }}
    >
      <header className="text-center mb-4">
        <div className="d-flex align-items-center justify-content-center mb-2">
          <h1 className="h2 mb-0">{intl.formatMessage(messages.heading)}</h1>
          <Badge
            variant="info"
            className="ml-2 text-uppercase font-weight-bold"
          >
            {intl.formatMessage(messages.beta)}
          </Badge>
        </div>
        <p className="text-muted mb-0">{intl.formatMessage(messages.intro)}</p>
      </header>

      <GoalSummaryCard
        ref={goalSummaryCardRef}
        learnerIntent={learnerIntent}
        isEditing={isEditing}
        isProfileSubmitting={isProfileSubmitting}
        profileError={profileError}
        onBeginEditing={() => setIsEditing(true)}
        onEndEditing={() => setIsEditing(false)}
        onSubmitGoalSummary={onSubmitGoalSummary}
      />

      <RequestErrorAlert error={pathwayError} />

      <Row>
        <Col lg={7} className="mb-3">
          <CareerMatchesCard
            orderedMatches={orderedMatches}
            selectedCareer={selectedCareer}
            isBuildingPathway={isBuildingPathway}
            isCareerMatchesLoading={isCareerMatchesLoading}
            careerMatchesError={careerMatchesError}
            onSelectCareer={onSelectCareer}
            onBeginEditing={() => setIsEditing(true)}
          />
        </Col>
        <Col lg={5} className="mb-3">
          <SkillsToDevelopCard
            visibleSkills={visibleSkills}
            dismissedSkillCount={dismissedSkillCount}
            onDismissSkill={onDismissSkill}
            onRestoreSkills={onRestoreSkills}
          />
        </Col>
      </Row>

      <OverwritePathwayModal
        isOpen={isOverwriteOpen}
        isBuildingPathway={isBuildingPathway}
        onClose={onCloseOverwrite}
        onConfirm={onConfirmOverwrite}
        triggerRef={buildButtonRef}
      />

      <RetakeQuizModal
        isOpen={isRetakeOpen}
        onClose={onCloseRetake}
        onConfirm={onConfirmRetake}
        triggerRef={retakeButtonRef}
      />

      <NoPathwayCoursesModal
        isOpen={isNoCoursesOpen}
        onClose={onCloseNoCourses}
        onEditGoalSummary={handleEditGoalSummaryFromNoCourses}
      />
    </section>
  );
};

export default CareerSelectionPage;
