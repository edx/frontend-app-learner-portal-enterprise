import React from 'react';
import { ActionRow, Button, Spinner } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { CareerMatch } from '../state';
import messages from './messages';

export interface BuildPathwayFooterProps {
  selectedCareer: CareerMatch | null;
  isBuildingPathway?: boolean;
  isCareerMatchesLoading?: boolean;
  hasExistingPathway?: boolean;
  onBuildPathway: () => Promise<void>;
  onOpenOverwrite: () => void;
  buildButtonRef?: React.RefObject<HTMLButtonElement>;
}

const BuildPathwayFooter = ({
  selectedCareer,
  isBuildingPathway = false,
  isCareerMatchesLoading = false,
  hasExistingPathway = false,
  onBuildPathway,
  onOpenOverwrite,
  buildButtonRef,
}: BuildPathwayFooterProps) => {
  const intl = useIntl();

  const handleClick = () => {
    if (hasExistingPathway) {
      onOpenOverwrite();
    } else {
      onBuildPathway();
    }
  };

  return (
    <footer
      className="bg-white border-top py-3 mt-3"
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        boxShadow: '0 -0.25rem 0.75rem rgba(0,0,0,0.08)',
      }}
      data-testid="career-selection-sticky-footer"
    >
      <ActionRow className="px-3">
        <ActionRow.Spacer />
        <Button
          ref={buildButtonRef}
          type="button"
          variant="primary"
          size="lg"
          onClick={handleClick}
          disabled={!selectedCareer || isBuildingPathway || isCareerMatchesLoading}
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
            isBuildingPathway ? messages.buildingPathway : messages.buildPathway,
          )}
        </Button>
      </ActionRow>
    </footer>
  );
};

export default BuildPathwayFooter;
