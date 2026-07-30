import React from 'react';
import { Button, Card, Chip } from '@openedx/paragon';
import { Close } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

const SkillsEmptyState = () => {
  const intl = useIntl();
  return (
    <p
      className="text-muted small"
      data-testid="skills-empty-state"
    >
      {intl.formatMessage(messages.noSkills)}
    </p>
  );
};

export interface SkillsToDevelopCardProps {
  visibleSkills: string[];
  dismissedSkillCount: number;
  onDismissSkill: (skill: string) => void;
  onRestoreSkills: () => void;
}

const SkillsToDevelopCard = ({
  visibleSkills,
  dismissedSkillCount,
  onDismissSkill,
  onRestoreSkills,
}: SkillsToDevelopCardProps) => {
  const intl = useIntl();

  return (
    <Card className="h-100 shadow-sm" data-testid="profile-skills">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <h2 className="mb-0">
            {intl.formatMessage(messages.skills)}
          </h2>
          {dismissedSkillCount > 0 && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="p-0 ml-3"
              onClick={onRestoreSkills}
            >
              {intl.formatMessage(messages.restoreSkills)}
            </Button>
          )}
        </div>
        <p className="text-muted mb-4">
          {intl.formatMessage(messages.skillsHelp)}
        </p>
        {visibleSkills.length > 0 && (
          <div className="d-flex flex-wrap" data-testid="skills-list">
            {visibleSkills.map((skill) => (
              <Chip
                key={skill}
                variant="light"
                className="mr-2 mb-2 bg-light-500"
                iconAfter={Close}
                iconAfterAlt={intl.formatMessage(messages.dismissSkill, {
                  skill,
                })}
                onIconAfterClick={() => onDismissSkill(skill)}
              >
                {skill}
              </Chip>
            ))}
          </div>
        )}
        {visibleSkills.length === 0 && <SkillsEmptyState />}
      </Card.Body>
    </Card>
  );
};

export default SkillsToDevelopCard;
