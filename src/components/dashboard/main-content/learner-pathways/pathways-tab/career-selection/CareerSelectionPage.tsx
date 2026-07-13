import React, { useMemo, useState } from 'react';
import { Badge, Col, Row } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { CareerMatch, LearnerProfile } from '../state';
import GoalSummaryCard, { type GoalSummaryFields } from './GoalSummaryCard';
import CareerMatchesCard from './CareerMatchesCard';
import type { OrderedMatch } from './CareerMatchesCard';
import SkillsToDevelopCard from './SkillsToDevelopCard';
import OverwritePathwayModal from './OverwritePathwayModal';
import RetakeQuizModal from './RetakeQuizModal';
import { deriveSelectedCareer } from './selectors';
import messages from './messages';

const MIN_VISIBLE_MATCH_PERCENTAGE = 25;

export interface CareerSelectionPageProps {
  profile: LearnerProfile;
  careerMatches: CareerMatch[];
  selectedCareerId?: string | null;
  isProfileSubmitting?: boolean;
  isCareerMatchesLoading?: boolean;
  isBuildingPathway?: boolean;
  profileError?: string | null;
  careerMatchesError?: string | null;
  onSubmitGoalSummary: (updates: GoalSummaryFields) => Promise<void> | void;
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
  profile,
  careerMatches,
  selectedCareerId = null,
  isProfileSubmitting = false,
  isCareerMatchesLoading = false,
  isBuildingPathway = false,
  profileError = null,
  careerMatchesError = null,
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
  visibleSkills,
  dismissedSkillCount,
  onDismissSkill,
  onRestoreSkills,
}: CareerSelectionPageProps) => {
  const intl = useIntl();
  const [isEditing, setIsEditing] = useState(false);

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
        profile={profile}
        isEditing={isEditing}
        isProfileSubmitting={isProfileSubmitting}
        profileError={profileError}
        onBeginEditing={() => setIsEditing(true)}
        onEndEditing={() => setIsEditing(false)}
        onSubmitGoalSummary={onSubmitGoalSummary}
      />

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
    </section>
  );
};

export default CareerSelectionPage;
