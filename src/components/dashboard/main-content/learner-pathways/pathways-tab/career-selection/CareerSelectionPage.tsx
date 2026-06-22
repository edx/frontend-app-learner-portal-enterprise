import React, { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  Col,
  Form,
  ModalDialog,
  Row,
  Spinner,
} from '@openedx/paragon';
import { Close, Edit } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { CareerMatch, LearnerProfile } from '../state';
import messages from './messages';

const MIN_VISIBLE_MATCH_PERCENTAGE = 25;

export type GoalSummaryFields = Pick<
LearnerProfile,
'careerGoal' | 'targetIndustry' | 'background' | 'motivation'
>;

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

const uniqueSkills = (skills: string[]) => Array.from(new Set(skills.map((skill) => skill.trim()).filter(Boolean)));

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
  const [draft, setDraft] = useState<GoalSummaryFields>({
    careerGoal: profile.careerGoal,
    targetIndustry: profile.targetIndustry,
    background: profile.background,
    motivation: profile.motivation,
  });

  useEffect(() => {
    if (!isEditing) {
      setDraft({
        careerGoal: profile.careerGoal,
        targetIndustry: profile.targetIndustry,
        background: profile.background,
        motivation: profile.motivation,
      });
    }
  }, [
    isEditing,
    profile.background,
    profile.careerGoal,
    profile.motivation,
    profile.targetIndustry,
  ]);

  const orderedMatches = useMemo(
    () => careerMatches
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
    () => orderedMatches.find(({ match }) => match.id === selectedCareerId)
      ?.match
      ?? orderedMatches[0]?.match
      ?? null,
    [orderedMatches, selectedCareerId],
  );

  const availableSkills = useMemo(
    () => uniqueSkills(
      selectedCareer?.skillsToDevelop?.length
        ? selectedCareer.skillsToDevelop
        : profile.skills,
    ),
    [profile.skills, selectedCareer],
  );
  const skillsSignature = availableSkills.join('\u0000');

  useEffect(() => {
    setDismissedSkills(new Set<string>());
  }, [selectedCareer?.id, skillsSignature]);

  const visibleSkills = availableSkills.filter(
    (skill) => !dismissedSkills.has(skill),
  );
  const isDirty = draft.careerGoal !== profile.careerGoal
    || draft.targetIndustry !== profile.targetIndustry
    || draft.background !== profile.background
    || draft.motivation !== profile.motivation;

  const beginEditing = () => {
    setDraft({
      careerGoal: profile.careerGoal,
      targetIndustry: profile.targetIndustry,
      background: profile.background,
      motivation: profile.motivation,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    beginEditing();
    setIsEditing(false);
  };

  const submitGoalSummary = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || isProfileSubmitting) {
      return;
    }
    try {
      await onSubmitGoalSummary({
        careerGoal: draft.careerGoal.trim(),
        targetIndustry: draft.targetIndustry.trim(),
        background: draft.background.trim(),
        motivation: draft.motivation.trim(),
      });
      setIsEditing(false);
    } catch {
      // The connected container owns the surfaced error state; keep edit mode open for retry.
    }
  };

  const dismissSkill = (skill: string) => {
    setDismissedSkills((current) => new Set([...current, skill]));
  };

  const buildPathway = async () => {
    if (!selectedCareer || isBuildingPathway) {
      return;
    }
    await onBuildPathway(selectedCareer, visibleSkills);
    setIsOverwriteOpen(false);
  };

  const renderValue = (value: string) => value || intl.formatMessage(messages.notProvided);

  return (
    <section
      data-testid="profile-container"
      className="mx-auto pb-2"
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

      <Card className="mb-3 shadow-sm" data-testid="goal-summary-card">
        <Form onSubmit={submitGoalSummary}>
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-start mb-4">
              <h2 className="h4 mb-0">
                {intl.formatMessage(messages.goalSummary)}
              </h2>
              {isEditing ? (
                <div className="d-flex align-items-center">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    className="mr-2"
                    onClick={cancelEditing}
                    disabled={isProfileSubmitting}
                  >
                    {intl.formatMessage(messages.cancel)}
                  </Button>
                  <Button
                    type="submit"
                    variant="outline-primary"
                    size="sm"
                    disabled={!isDirty || isProfileSubmitting}
                    data-testid="goal-summary-submit-button"
                  >
                    {isProfileSubmitting && (
                      <Spinner
                        animation="border"
                        size="sm"
                        className="mr-2"
                        screenReaderText={intl.formatMessage(
                          messages.submitting,
                        )}
                      />
                    )}
                    {intl.formatMessage(
                      isProfileSubmitting
                        ? messages.submitting
                        : messages.submit,
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline-primary"
                  size="sm"
                  iconBefore={Edit}
                  onClick={beginEditing}
                  data-testid="goal-summary-edit-button"
                >
                  {intl.formatMessage(messages.edit)}
                </Button>
              )}
            </div>

            {profileError && (
              <Alert variant="danger" className="mb-4">
                {profileError}
              </Alert>
            )}

            {isEditing ? (
              <>
                <Row>
                  <Col md={6}>
                    <Form.Group controlId="career-selection-career-goal">
                      <Form.Label>
                        {intl.formatMessage(messages.careerGoal)}
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={draft.careerGoal}
                        onChange={(
                          event: React.ChangeEvent<HTMLTextAreaElement>,
                        ) => setDraft({ ...draft, careerGoal: event.target.value })}
                        disabled={isProfileSubmitting}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="career-selection-target-industry">
                      <Form.Label>
                        {intl.formatMessage(messages.targetIndustry)}
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={draft.targetIndustry}
                        onChange={(
                          event: React.ChangeEvent<HTMLTextAreaElement>,
                        ) => setDraft({
                          ...draft,
                          targetIndustry: event.target.value,
                        })}
                        disabled={isProfileSubmitting}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group controlId="career-selection-background">
                  <Form.Label>
                    {intl.formatMessage(messages.background)}
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={draft.background}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft({ ...draft, background: event.target.value })}
                    disabled={isProfileSubmitting}
                  />
                </Form.Group>
                <Form.Group
                  controlId="career-selection-motivation"
                  className="mb-0"
                >
                  <Form.Label>
                    {intl.formatMessage(messages.motivation)}
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={draft.motivation}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft({ ...draft, motivation: event.target.value })}
                    disabled={isProfileSubmitting}
                  />
                </Form.Group>
              </>
            ) : (
              <>
                <Row className="mb-3">
                  <Col
                    md={6}
                    className="mb-3 mb-md-0"
                    data-testid="profile-career-goal"
                  >
                    <h3 className="h6 mb-1">
                      {intl.formatMessage(messages.careerGoal)}
                    </h3>
                    <p className="mb-0">{renderValue(profile.careerGoal)}</p>
                  </Col>
                  <Col md={6} data-testid="profile-target-industry">
                    <h3 className="h6 mb-1">
                      {intl.formatMessage(messages.targetIndustry)}
                    </h3>
                    <p className="mb-0">
                      {renderValue(profile.targetIndustry)}
                    </p>
                  </Col>
                </Row>
                <div className="mb-3" data-testid="profile-background">
                  <h3 className="h6 mb-1">
                    {intl.formatMessage(messages.background)}
                  </h3>
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {renderValue(profile.background)}
                  </p>
                </div>
                <div data-testid="profile-motivation">
                  <h3 className="h6 mb-1">
                    {intl.formatMessage(messages.motivation)}
                  </h3>
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {renderValue(profile.motivation)}
                  </p>
                </div>
              </>
            )}
          </Card.Body>
        </Form>
      </Card>

      <Row>
        <Col lg={7} className="mb-3">
          <Card
            className="h-100 shadow-sm"
            data-testid="profile-career-matches"
          >
            <Card.Body className="p-4">
              <h2 className="h4 mb-3">
                {intl.formatMessage(messages.careerMatches)}
              </h2>
              <p className="text-muted small mb-4">
                {intl.formatMessage(messages.careerMatchesHelp)}
              </p>
              {careerMatchesError && (
                <Alert variant="danger" className="mb-3">
                  {careerMatchesError}
                </Alert>
              )}

              {isCareerMatchesLoading ? (
                <div
                  className="d-flex justify-content-center py-5"
                  data-testid="career-matches-loading"
                >
                  <Spinner
                    animation="border"
                    screenReaderText={intl.formatMessage(
                      messages.careerMatches,
                    )}
                  />
                </div>
              ) : orderedMatches.length > 0 ? (
                <div
                  role="list"
                  aria-label={intl.formatMessage(messages.careerMatches)}
                >
                  {orderedMatches.map(({ match, percentage }) => {
                    const isSelected = selectedCareer?.id === match.id;
                    return (
                      <Button
                        key={match.id}
                        type="button"
                        variant={isSelected ? 'primary' : 'outline-primary'}
                        className="w-100 d-flex justify-content-between align-items-center text-left mb-2 p-3"
                        style={{ whiteSpace: 'normal' }}
                        aria-pressed={isSelected}
                        onClick={() => onSelectCareer(match.id)}
                        disabled={isBuildingPathway}
                        data-testid={`career-match-${match.id}`}
                      >
                        <span className="font-weight-bold pr-3">
                          {match.title}
                        </span>
                        {percentage !== null && (
                          <Badge
                            variant={isSelected ? 'light' : 'info'}
                            className="font-weight-bold flex-shrink-0"
                          >
                            {intl.formatMessage(messages.matchPercentage, {
                              percentage,
                            })}
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="border rounded text-center p-4"
                  data-testid="career-matches-empty-state"
                >
                  <h3 className="h5">
                    {intl.formatMessage(messages.noMatches)}
                  </h3>
                  <p className="text-muted small">
                    {intl.formatMessage(messages.noMatchesHelp)}
                  </p>
                  <Button
                    type="button"
                    variant="outline-primary"
                    onClick={beginEditing}
                  >
                    {intl.formatMessage(messages.editGoalSummary)}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5} className="mb-3">
          <Card className="h-100 shadow-sm" data-testid="profile-skills">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <h2 className="h4 mb-0">
                  {intl.formatMessage(messages.skills)}
                </h2>
                {dismissedSkills.size > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="p-0 ml-3"
                    onClick={() => setDismissedSkills(new Set<string>())}
                  >
                    {intl.formatMessage(messages.restoreSkills)}
                  </Button>
                )}
              </div>
              <p className="text-muted small mb-4">
                {intl.formatMessage(messages.skillsHelp)}
              </p>
              {visibleSkills.length > 0 ? (
                <div className="d-flex flex-wrap" data-testid="skills-list">
                  {visibleSkills.map((skill) => (
                    <Chip
                      key={skill}
                      className="mr-2 mb-2"
                      iconAfter={Close}
                      iconAfterAlt={intl.formatMessage(messages.dismissSkill, {
                        skill,
                      })}
                      onIconAfterClick={() => dismissSkill(skill)}
                    >
                      {skill}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p
                  className="text-muted small"
                  data-testid="skills-empty-state"
                >
                  {intl.formatMessage(messages.noSkills)}
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <footer
        className="bg-white border-top py-3 mt-3"
        style={{
          bottom: 0,
          boxShadow: '0 -0.25rem 0.75rem rgba(0, 0, 0, 0.08)',
          position: 'sticky',
          zIndex: 10,
        }}
        data-testid="career-selection-sticky-footer"
      >
        <div className="d-flex justify-content-center px-3">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={() => (hasExistingPathway
              ? setIsOverwriteOpen(true)
              : void buildPathway())}
            disabled={
              !selectedCareer || isBuildingPathway || isCareerMatchesLoading
            }
            data-testid="profile-build-pathway-button"
          >
            {isBuildingPathway && (
              <Spinner
                animation="border"
                size="sm"
                className="mr-2"
                screenReaderText={intl.formatMessage(messages.buildingPathway)}
              />
            )}
            {intl.formatMessage(
              isBuildingPathway
                ? messages.buildingPathway
                : messages.buildPathway,
            )}
          </Button>
        </div>
      </footer>

      <ModalDialog
        title={intl.formatMessage(messages.overwriteTitle)}
        isOpen={isOverwriteOpen}
        onClose={() => setIsOverwriteOpen(false)}
        size="sm"
        hasCloseButton={false}
        isBlocking={isBuildingPathway}
        isOverflowVisible={false}
      >
        <ModalDialog.Header>
          <ModalDialog.Title>
            {intl.formatMessage(messages.overwriteTitle)}
          </ModalDialog.Title>
        </ModalDialog.Header>
        <ModalDialog.Body>
          <p className="mb-0">{intl.formatMessage(messages.overwriteBody)}</p>
        </ModalDialog.Body>
        <ModalDialog.Footer>
          <Button
            type="button"
            variant="tertiary"
            onClick={() => setIsOverwriteOpen(false)}
            disabled={isBuildingPathway}
          >
            {intl.formatMessage(messages.keepPathway)}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={buildPathway}
            disabled={isBuildingPathway}
          >
            {intl.formatMessage(messages.buildNewPathway)}
          </Button>
        </ModalDialog.Footer>
      </ModalDialog>
    </section>
  );
};

export default CareerSelectionPage;
