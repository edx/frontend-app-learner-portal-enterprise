import React from 'react';
import { Alert, Card } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { CareerMatch } from '../state';
import CareerMatchesBody from './CareerMatchesBody';
import type { OrderedMatch } from './CareerMatchesBody';
import messages from './messages';

export type { OrderedMatch } from './CareerMatchesBody';

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
          <CareerMatchesBody
            orderedMatches={orderedMatches}
            selectedCareer={selectedCareer}
            isBuildingPathway={isBuildingPathway}
            isCareerMatchesLoading={isCareerMatchesLoading}
            onSelectCareer={onSelectCareer}
            onBeginEditing={onBeginEditing}
          />
        </div>
      </Card.Body>
    </Card>
  );
};

export default CareerMatchesCard;
