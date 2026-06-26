import React from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Spinner,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { CareerMatch } from '../state';
import messages from './messages';

export interface OrderedMatch {
  match: CareerMatch;
  percentage: number | null;
}

export interface CareerMatchesCardProps {
  orderedMatches: OrderedMatch[];
  selectedCareer: CareerMatch | null;
  isBuildingPathway?: boolean;
  isCareerMatchesLoading?: boolean;
  careerMatchesError?: string | null;
  onSelectCareer: (careerId: string) => void;
  onBeginEditing: () => void;
}

const CareerMatchesCard = ({
  orderedMatches,
  selectedCareer,
  isBuildingPathway = false,
  isCareerMatchesLoading = false,
  careerMatchesError = null,
  onSelectCareer,
  onBeginEditing,
}: CareerMatchesCardProps) => {
  const intl = useIntl();

  return (
    <Card className="h-100 shadow-sm" data-testid="profile-career-matches">
      <Card.Body className="p-4">
        <h2 className="mb-3">
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

        <div aria-live="polite" aria-atomic="true">
          {(() => {
            if (isCareerMatchesLoading) {
              return (
                <div
                  className="d-flex justify-content-center py-5"
                  data-testid="career-matches-loading"
                >
                  <Spinner
                    animation="border"
                    screenReaderText={intl.formatMessage(messages.careerMatches)}
                  />
                </div>
              );
            }
            if (orderedMatches.length > 0) {
              return (
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
              );
            }
            return (
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
                  onClick={onBeginEditing}
                >
                  {intl.formatMessage(messages.editGoalSummary)}
                </Button>
              </div>
            );
          })()}
        </div>
      </Card.Body>
    </Card>
  );
};

export default CareerMatchesCard;
