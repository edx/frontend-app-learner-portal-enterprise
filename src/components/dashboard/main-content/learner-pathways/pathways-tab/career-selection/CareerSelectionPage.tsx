import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { Badge, Col, Row } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { CareerMatch, LearnerProfile } from '../state';
import GoalSummaryCard, { type GoalSummaryFields } from './GoalSummaryCard';
import CareerMatchesCard from './CareerMatchesCard';
import type { OrderedMatch } from './CareerMatchesCard';
import SkillsToDevelopCard from './SkillsToDevelopCard';
import BuildPathwayFooter from './BuildPathwayFooter';
import OverwritePathwayModal from './OverwritePathwayModal';
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
  hasExistingPathway?: boolean;
  onSubmitGoalSummary: (updates: GoalSummaryFields) => Promise<void> | void;
  onSelectCareer: (careerId: string) => void;
  onBuildPathway: (
    career: CareerMatch,
    skillsToDevelop: string[],
  ) => Promise<void> | void;
}

const normalizePercentage = (value?: number): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  const normalized = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized)));
};

const uniqueSkills = (skills: string[]) => (
  Array.from(new Set(skills.map((s) => s.trim()).filter(Boolean)))
);

const CareerSelectionPage = ({
  profile,
  careerMatches,
  selectedCareerId = null,
  isProfileSubmitting = false,
  isCareerMatchesLoading = false,
  isBuildingPathway = false,
  profileError = null,
  careerMatchesError = null,
  hasExistingPathway = false,
  onSubmitGoalSummary,
  onSelectCareer,
  onBuildPathway,
}: CareerSelectionPageProps) => {
  const intl = useIntl();
  const [isEditing, setIsEditing] = useState(false);
  const [isOverwriteOpen, setIsOverwriteOpen] = useState(false);
  const [dismissedSkills, setDismissedSkills] = useState<Set<string>>(
    new Set<string>(),
  );
  const buildButtonRef = useRef<HTMLButtonElement>(null);

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
    () => orderedMatches.find(({ match }) => match.id === selectedCareerId)?.match
      ?? orderedMatches[0]?.match
      ?? null,
    [orderedMatches, selectedCareerId],
  );

  const availableSkills = useMemo(
    () => uniqueSkills(selectedCareer?.skillsToDevelop ?? profile.skills),
    [profile.skills, selectedCareer],
  );
  const skillsSignature = availableSkills.join(' ');

  useEffect(() => {
    setDismissedSkills(new Set<string>());
  }, [selectedCareer?.id, skillsSignature]);

  const visibleSkills = availableSkills.filter(
    (skill) => !dismissedSkills.has(skill),
  );

  const buildPathway = async () => {
    if (!selectedCareer || isBuildingPathway) {
      return;
    }
    await onBuildPathway(selectedCareer, visibleSkills);
    setIsOverwriteOpen(false);
  };

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
            dismissedSkillCount={dismissedSkills.size}
            onDismissSkill={(skill) => setDismissedSkills(
              (current) => new Set([...current, skill]),
            )}
            onRestoreSkills={() => setDismissedSkills(new Set<string>())}
          />
        </Col>
      </Row>

      <BuildPathwayFooter
        selectedCareer={selectedCareer}
        isBuildingPathway={isBuildingPathway}
        isCareerMatchesLoading={isCareerMatchesLoading}
        hasExistingPathway={hasExistingPathway}
        onBuildPathway={buildPathway}
        onOpenOverwrite={() => setIsOverwriteOpen(true)}
        buildButtonRef={buildButtonRef}
      />

      <OverwritePathwayModal
        isOpen={isOverwriteOpen}
        isBuildingPathway={isBuildingPathway}
        onClose={() => setIsOverwriteOpen(false)}
        onConfirm={buildPathway}
        triggerRef={buildButtonRef}
      />
    </section>
  );
};

export default CareerSelectionPage;
