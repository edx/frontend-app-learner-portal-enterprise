import '@testing-library/jest-dom/extend-expect';
import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider, defineMessages } from '@edx/frontend-platform/i18n';

import { PathwaysActionBarProvider, usePathwaysActionBar } from '../index';

const msgs = defineMessages({
  buildPathway: { id: 'test.build', defaultMessage: 'Build pathway' },
  buildingPathway: { id: 'test.building', defaultMessage: 'Building...' },
  skip: { id: 'test.skip', defaultMessage: 'Skip' },
});

const renderWithProvider = (ui: React.ReactNode) => render(
  <IntlProvider locale="en">
    <PathwaysActionBarProvider>
      {ui}
    </PathwaysActionBarProvider>
  </IntlProvider>,
);

// Helper: registers a config on mount via the hook
const ActionRegistrar = ({
  config,
}: { config: Parameters<ReturnType<typeof usePathwaysActionBar>['registerActions']>[0] }) => {
  const { registerActions, clearActions } = usePathwaysActionBar();
  useEffect(() => {
    registerActions(config);
    return () => clearActions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

describe('PathwaysActionBarProvider / PathwaysActionBar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the primary action label', () => {
    renderWithProvider(
      <ActionRegistrar config={{ primary: { id: 'p', label: msgs.buildPathway, variant: 'primary' } }} />,
    );
    expect(screen.getByText('Build pathway')).toBeInTheDocument();
  });

  it('renders secondary actions', () => {
    renderWithProvider(
      <ActionRegistrar config={{
        primary: { id: 'p', label: msgs.buildPathway, variant: 'primary' },
        secondary: [{ id: 's', label: msgs.skip, variant: 'tertiary' }],
      }}
      />,
    );
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('disables the primary button when disabled: true', () => {
    renderWithProvider(
      <ActionRegistrar config={{
        primary: {
          id: 'p', label: msgs.buildPathway, variant: 'primary', disabled: true, testId: 'primary-btn',
        },
      }}
      />,
    );
    expect(screen.getByTestId('primary-btn')).toBeDisabled();
  });

  it('shows loadingLabel and spinner when loading: true', () => {
    renderWithProvider(
      <ActionRegistrar config={{
        primary: {
          id: 'p', label: msgs.buildPathway, loadingLabel: msgs.buildingPathway, variant: 'primary', loading: true, testId: 'primary-btn',
        },
      }}
      />,
    );
    expect(screen.getByTestId('primary-btn')).toHaveTextContent('Building...');
    expect(screen.getByTestId('primary-btn')).toBeDisabled();
  });

  it('sets the form attribute on a submit button', () => {
    renderWithProvider(
      <ActionRegistrar config={{
        primary: {
          id: 'p', label: msgs.buildPathway, variant: 'primary', type: 'submit', form: 'my-form', testId: 'submit-btn',
        },
      }}
      />,
    );
    expect(screen.getByTestId('submit-btn')).toHaveAttribute('form', 'my-form');
    expect(screen.getByTestId('submit-btn')).toHaveAttribute('type', 'submit');
  });

  it('attaches a buttonRef to the rendered button', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const ConfigWithRef = () => {
      const { registerActions, clearActions } = usePathwaysActionBar();
      useEffect(() => {
        registerActions({
          primary: {
            id: 'p', label: msgs.buildPathway, variant: 'primary', buttonRef: ref, testId: 'ref-btn',
          },
        });
        return () => clearActions();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    };
    renderWithProvider(<ConfigWithRef />);
    expect(ref.current).toBe(screen.getByTestId('ref-btn'));
  });

  it('renders the iconBefore icon on a button', () => {
    const MockIcon = () => <svg data-testid="mock-icon" />;
    renderWithProvider(
      <ActionRegistrar config={{
        primary: {
          id: 'p', label: msgs.buildPathway, variant: 'tertiary', iconBefore: MockIcon, testId: 'icon-btn',
        },
      }}
      />,
    );
    expect(screen.getByTestId('icon-btn')).toContainElement(screen.getByTestId('mock-icon'));
  });

  it('renders the iconAfter icon on a button', () => {
    const MockIcon = () => <svg data-testid="mock-icon-after" />;
    renderWithProvider(
      <ActionRegistrar config={{
        primary: {
          id: 'p', label: msgs.buildPathway, variant: 'tertiary', iconAfter: MockIcon, testId: 'icon-after-btn',
        },
      }}
      />,
    );
    expect(screen.getByTestId('icon-after-btn')).toContainElement(screen.getByTestId('mock-icon-after'));
  });

  it('renders both iconBefore and iconAfter on the same button without regressing either', () => {
    const MockIconBefore = () => <svg data-testid="mock-icon-before" />;
    const MockIconAfter = () => <svg data-testid="mock-icon-after" />;
    renderWithProvider(
      <ActionRegistrar config={{
        primary: {
          id: 'p',
          label: msgs.buildPathway,
          variant: 'tertiary',
          iconBefore: MockIconBefore,
          iconAfter: MockIconAfter,
          testId: 'icon-both-btn',
        },
      }}
      />,
    );
    expect(screen.getByTestId('icon-both-btn')).toContainElement(screen.getByTestId('mock-icon-before'));
    expect(screen.getByTestId('icon-both-btn')).toContainElement(screen.getByTestId('mock-icon-after'));
  });

  it('sets aria-label on the footer landmark', () => {
    renderWithProvider(
      <ActionRegistrar config={{ primary: { id: 'p', label: msgs.buildPathway, variant: 'primary' }, label: 'Custom label' }} />,
    );
    expect(screen.getByRole('contentinfo', { name: 'Custom label' })).toBeInTheDocument();
  });

  it('removes the action bar when clearActions is called on unmount', () => {
    const { unmount } = renderWithProvider(
      <ActionRegistrar config={{ primary: { id: 'p', label: msgs.buildPathway, variant: 'primary' } }} />,
    );
    expect(screen.getByText('Build pathway')).toBeInTheDocument();
    unmount();
    expect(screen.queryByText('Build pathway')).not.toBeInTheDocument();
  });

  it('invokes primary onClick when the button is clicked', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    renderWithProvider(
      <ActionRegistrar config={{
        primary: {
          id: 'p', label: msgs.buildPathway, variant: 'primary', onClick, testId: 'primary-btn',
        },
      }}
      />,
    );
    await user.click(screen.getByTestId('primary-btn'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders inline (no portal) when #page-action-bar target is absent', () => {
    // jsdom does not include #page-action-bar — bar should still render inline
    renderWithProvider(
      <ActionRegistrar config={{
        primary: {
          id: 'p', label: msgs.buildPathway, variant: 'primary', testId: 'inline-btn',
        },
      }}
      />,
    );
    expect(screen.getByTestId('inline-btn')).toBeInTheDocument();
  });

  it('renders nothing when no config is registered', () => {
    renderWithProvider(<div data-testid="child">content</div>);
    expect(screen.queryByTestId('pathways-action-bar')).not.toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders exactly one primary button — no duplicate from inline + portal', () => {
    renderWithProvider(
      <ActionRegistrar config={{
        primary: {
          id: 'p', label: msgs.buildPathway, variant: 'primary', testId: 'primary-btn',
        },
      }}
      />,
    );
    expect(screen.getAllByTestId('primary-btn')).toHaveLength(1);
  });
});
