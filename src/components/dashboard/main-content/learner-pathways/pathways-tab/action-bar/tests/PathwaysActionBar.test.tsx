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

  describe('split alignment secondary spacing', () => {
    it('wraps multiple secondary actions in a Stack with the 32px (gap 4.5) Figma spacing', () => {
      renderWithProvider(
        <ActionRegistrar config={{
          primary: { id: 'p', label: msgs.buildPathway, variant: 'primary' },
          secondary: [
            {
              id: 's1', label: msgs.skip, variant: 'tertiary', testId: 'secondary-one',
            },
            {
              id: 's2', label: msgs.buildingPathway, variant: 'tertiary', testId: 'secondary-two',
            },
          ],
          alignment: 'split',
        }}
        />,
      );
      const stack = screen.getByTestId('pathways-action-bar-secondary-stack');
      expect(stack).toHaveClass('pgn__hstack');
      expect(stack).toHaveClass('pgn__stack-gap--4.5');
      expect(stack).toContainElement(screen.getByTestId('secondary-one'));
      expect(stack).toContainElement(screen.getByTestId('secondary-two'));
    });

    it('still renders correctly with a single secondary action under split alignment', () => {
      renderWithProvider(
        <ActionRegistrar config={{
          primary: { id: 'p', label: msgs.buildPathway, variant: 'primary' },
          secondary: [{
            id: 's', label: msgs.skip, variant: 'tertiary', testId: 'secondary-one',
          }],
          alignment: 'split',
        }}
        />,
      );
      expect(screen.getByTestId('secondary-one')).toBeInTheDocument();
      expect(screen.getByTestId('pathways-action-bar-secondary-stack')).toHaveClass('pgn__stack-gap--4.5');
    });
  });

  describe('end alignment button spacing', () => {
    it('wraps secondary actions and primary together in one Stack with the 32px (gap 4.5) Figma spacing', () => {
      renderWithProvider(
        <ActionRegistrar config={{
          primary: {
            id: 'p', label: msgs.buildPathway, variant: 'primary', testId: 'primary-btn',
          },
          secondary: [
            {
              id: 's1', label: msgs.skip, variant: 'tertiary', testId: 'secondary-one',
            },
            {
              id: 's2', label: msgs.buildingPathway, variant: 'tertiary', testId: 'secondary-two',
            },
          ],
          alignment: 'end',
        }}
        />,
      );
      const stack = screen.getByTestId('pathways-action-bar-end-stack');
      expect(stack).toHaveClass('pgn__hstack');
      expect(stack).toHaveClass('pgn__stack-gap--4.5');
      expect(stack).toContainElement(screen.getByTestId('secondary-one'));
      expect(stack).toContainElement(screen.getByTestId('secondary-two'));
      expect(stack).toContainElement(screen.getByTestId('primary-btn'));
      // The 'split'-only pre-spacer cluster testid must not also appear for 'end'.
      expect(screen.queryByTestId('pathways-action-bar-secondary-stack')).not.toBeInTheDocument();
    });

    it('wraps a single secondary action alongside primary (the real IntakeQuestionsContainer shape)', () => {
      renderWithProvider(
        <ActionRegistrar config={{
          primary: {
            id: 'p', label: msgs.buildPathway, variant: 'primary', testId: 'primary-btn',
          },
          secondary: [{
            id: 's', label: msgs.skip, variant: 'tertiary', testId: 'secondary-one',
          }],
          alignment: 'end',
        }}
        />,
      );
      const stack = screen.getByTestId('pathways-action-bar-end-stack');
      expect(stack).toHaveClass('pgn__stack-gap--4.5');
      expect(stack).toContainElement(screen.getByTestId('secondary-one'));
      expect(stack).toContainElement(screen.getByTestId('primary-btn'));
    });
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

  it('renders an action with a destination as a Hyperlink, not a Button', () => {
    renderWithProvider(
      <ActionRegistrar config={{
        primary: { id: 'p', label: msgs.buildPathway, variant: 'primary' },
        secondary: [{
          id: 's', label: msgs.skip, destination: 'https://example.com/form', testId: 'link-action',
        }],
      }}
      />,
    );
    const link = screen.getByTestId('link-action');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://example.com/form');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByRole('button', { name: 'Build pathway' })).toBeInTheDocument();
  });

  it('defaults a destination action to target="_blank" and respects an explicit target', () => {
    renderWithProvider(
      <ActionRegistrar config={{
        secondary: [{
          id: 's', label: msgs.skip, destination: 'https://example.com/form', target: '_self', testId: 'link-action',
        }],
      }}
      />,
    );
    expect(screen.getByTestId('link-action')).toHaveAttribute('target', '_self');
  });

  it('invokes onClick for a destination-based action', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    renderWithProvider(
      <ActionRegistrar config={{
        secondary: [{
          id: 's', label: msgs.skip, destination: 'https://example.com/form', onClick, testId: 'link-action',
        }],
      }}
      />,
    );
    await user.click(screen.getByTestId('link-action'));
    expect(onClick).toHaveBeenCalledTimes(1);
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
