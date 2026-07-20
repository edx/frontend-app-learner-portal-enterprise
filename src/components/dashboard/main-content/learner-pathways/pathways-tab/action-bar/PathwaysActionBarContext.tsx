import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import ReactDOM from 'react-dom';
import {
  ActionRow,
  Button,
  Container,
  Hyperlink,
  Spinner,
  Stack,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { PathwaysAction, PathwaysActionBarConfig } from './types';
import messages from './messages';

// ─── Inner action bar renderer ────────────────────────────────────────────────

interface PathwaysActionBarProps {
  config: PathwaysActionBarConfig;
}

// Figma calls for a 32px gap between adjacent action-bar buttons, in every alignment
// mode. Paragon's Stack gap scale is discrete (spacer-map keys); 4.5 resolves to
// exactly 2rem (32px) at this app's default 16px root font-size — the exact value,
// not an approximation.
const ACTION_BAR_BUTTON_GAP = 4.5;

const renderAction = (action: PathwaysAction, intl: ReturnType<typeof useIntl>) => {
  const label = action.loading && action.loadingLabel
    ? intl.formatMessage(action.loadingLabel)
    : intl.formatMessage(action.label);

  if (action.destination) {
    return (
      <Hyperlink
        key={action.id}
        destination={action.destination}
        target={action.target ?? '_blank'}
        onClick={action.onClick}
        data-testid={action.testId}
      >
        {label}
      </Hyperlink>
    );
  }

  return (
    <Button
      key={action.id}
      ref={action.buttonRef}
      type={action.type ?? 'button'}
      form={action.form}
      variant={action.variant}
      disabled={action.disabled || action.loading}
      onClick={action.onClick}
      iconBefore={action.iconBefore}
      data-testid={action.testId}
    >
      {action.loading && (
        <Spinner
          animation="border"
          size="sm"
          className="mr-2"
          screenReaderText={label}
        />
      )}
      {label}
    </Button>
  );
};

const renderActionCluster = (
  actions: PathwaysAction[],
  intl: ReturnType<typeof useIntl>,
  testId: string,
) => (
  <Stack direction="horizontal" gap={ACTION_BAR_BUTTON_GAP} data-testid={testId}>
    {actions.map((action) => renderAction(action, intl))}
  </Stack>
);

const PathwaysActionBar = ({ config }: PathwaysActionBarProps) => {
  const intl = useIntl();
  const {
    primary,
    secondary = [],
    alignment = 'end',
    label,
  } = config;

  return (
    <footer
      aria-label={label ?? intl.formatMessage(messages.defaultActionBarLabel)}
      className="bg-white border-top py-3"
      style={{
        boxShadow: '0 -0.25rem 0.75rem rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
      data-testid="pathways-action-bar"
    >
      <Container size="lg">
        {alignment === 'split' ? (
          <ActionRow>
            {primary && renderAction(primary, intl)}
            <ActionRow.Spacer />
            {renderActionCluster(secondary, intl, 'pathways-action-bar-secondary-stack')}
          </ActionRow>
        ) : (
          <ActionRow>
            {alignment !== 'end' && renderActionCluster(secondary, intl, 'pathways-action-bar-secondary-stack')}
            <ActionRow.Spacer />
            {alignment === 'end' && renderActionCluster(
              [...secondary, ...(primary ? [primary] : [])],
              intl,
              'pathways-action-bar-end-stack',
            )}
            {alignment !== 'end' && primary && renderAction(primary, intl)}
          </ActionRow>
        )}
      </Container>
    </footer>
  );
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface PathwaysActionBarContextValue {
  registerActions: (config: PathwaysActionBarConfig) => void;
  clearActions: () => void;
}

export const PathwaysActionBarContext = createContext<PathwaysActionBarContextValue>({
  registerActions: () => {},
  clearActions: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const PathwaysActionBarProvider = ({ children }: { children: React.ReactNode }) => {
  const [config, setConfig] = useState<PathwaysActionBarConfig | null>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  useLayoutEffect(() => {
    setPortalTarget(document.getElementById('page-action-bar'));
  }, []);

  const registerActions = useCallback((newConfig: PathwaysActionBarConfig) => {
    setConfig(newConfig);
  }, []);

  const clearActions = useCallback(() => {
    setConfig(null);
  }, []);

  const contextValue = useMemo(
    () => ({ registerActions, clearActions }),
    [registerActions, clearActions],
  );

  const bar = config ? <PathwaysActionBar config={config} /> : null;

  return (
    <PathwaysActionBarContext.Provider value={contextValue}>
      {children}
      {/* Portal into Layout's #page-action-bar; fall back to inline for tests (jsdom has no portal target) */}
      {portalTarget ? ReactDOM.createPortal(bar, portalTarget) : bar}
    </PathwaysActionBarContext.Provider>
  );
};

export const usePathwaysActionBar = (): PathwaysActionBarContextValue => {
  const ctx = useContext(PathwaysActionBarContext);
  return ctx;
};

export default PathwaysActionBar;
