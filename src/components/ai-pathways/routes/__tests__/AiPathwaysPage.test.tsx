import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AiPathwaysPage } from '../AiPathwaysPage';
import { usePathways } from '../../hooks/usePathways';
import { FEATURE_STEPS } from '../../constants';

jest.mock('../../hooks/usePathways');
jest.mock('../../hooks/usePromptInterceptor', () => ({
  usePromptInterceptor: () => ({
    interceptPrompt: jest.fn(),
    pendingInterception: null,
    accept: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
  }),
}));

jest.mock('../../components', () => ({
  LoadingState: () => <div data-testid="loading-state">Loading...</div>,
  ErrorState: ({ message }: { message: string }) => <div data-testid="error-state">{message}</div>,
  IntakeForm: ({ onSubmit }: { onSubmit: (args: any) => void }) => (
    <div data-testid="mock-intake-form" onClick={() => onSubmit({ bringsYouHereRes: 'test' })}>Intake Form</div>
  ),
  UserProfile: ({ onUpdateProfile, onBuildPathway, onSelectCareer }: any) => (
    <div
      data-testid="mock-user-profile"
      onClick={() => onUpdateProfile({ careerGoal: 'New Goal' })}
      onContextMenu={(e) => { e.preventDefault(); onBuildPathway(); }}
      onDoubleClick={() => onSelectCareer({ title: 'Career' })}
    >
      User Profile
    </div>
  ),
  PathwayList: ({ onAdjustPathway }: { onAdjustPathway: () => void }) => (
    <div data-testid="mock-pathway-list" onClick={onAdjustPathway}>Pathway List</div>
  ),
  DebugConsole: () => <div data-testid="debug-console">Debug Console</div>,
  PromptEditorModal: () => <div data-testid="prompt-editor">Prompt Editor</div>,
}));

const customRender = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en">
      {ui}
    </IntlProvider>
  );
};

describe('AiPathwaysPage', () => {
  const mockUsePathways = usePathways as jest.Mock;

  const baseReturn = {
    currentStep: FEATURE_STEPS.INTAKE,
    learnerProfile: null,
    selectedCareer: null,
    pathway: null,
    pathwayResponse: null,
    isLoading: false,
    error: null,
    generateProfile: jest.fn(),
    selectCareer: jest.fn(),
    generatePathway: jest.fn(),
    setCurrentStep: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathways.mockReturnValue(baseReturn);
    delete (window as any).location;
    (window as any).location = new URL('http://test.com');
  });

  it('renders IntakeForm by default', () => {
    customRender(<AiPathwaysPage />);
    expect(screen.getByTestId('mock-intake-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mock-intake-form'));
    expect(baseReturn.generateProfile).toHaveBeenCalled();
  });

  it('renders LoadingState in PROFILE step when loading', () => {
    mockUsePathways.mockReturnValue({
      ...baseReturn,
      currentStep: FEATURE_STEPS.PROFILE,
      isLoading: true,
    });
    customRender(<AiPathwaysPage />);
    expect(screen.getByText('Loading...', { selector: 'div' })).toBeInTheDocument();
  });

  it('renders ErrorState in PROFILE step when error occurs', () => {
    mockUsePathways.mockReturnValue({
      ...baseReturn,
      currentStep: FEATURE_STEPS.PROFILE,
      error: new Error('Profile failed'),
    });
    customRender(<AiPathwaysPage />);
    expect(screen.getByText('Profile failed')).toBeInTheDocument();
  });

  it('renders ErrorState in PROFILE step if no profile found', () => {
    mockUsePathways.mockReturnValue({
      ...baseReturn,
      currentStep: FEATURE_STEPS.PROFILE,
      learnerProfile: null,
      isLoading: false,
    });
    customRender(<AiPathwaysPage />);
    expect(screen.getByText('No profile found')).toBeInTheDocument();
  });

  it('renders UserProfile when profile is available', () => {
     mockUsePathways.mockReturnValue({
      ...baseReturn,
      currentStep: FEATURE_STEPS.PROFILE,
      learnerProfile: { name: 'Test', careerMatches: [], skills: [] },
    });
    customRender(<AiPathwaysPage />);
    expect(screen.getByTestId('mock-user-profile')).toBeInTheDocument();

    // Test onUpdateProfile
    fireEvent.click(screen.getByTestId('mock-user-profile'));
    expect(baseReturn.generateProfile).toHaveBeenCalled();

    // Test onBuildPathway
    fireEvent.contextMenu(screen.getByTestId('mock-user-profile'));
    expect(baseReturn.generatePathway).toHaveBeenCalled();

    // Test onSelectCareer
    fireEvent.doubleClick(screen.getByTestId('mock-user-profile'));
    expect(baseReturn.selectCareer).toHaveBeenCalledWith({ title: 'Career' });

    // Test onUpdateProfile with isDebug
    (window as any).location = new URL('http://test.com?debug=true');
    customRender(<AiPathwaysPage />);
    const userProfile2 = screen.getAllByTestId('mock-user-profile')[1];
    fireEvent.click(userProfile2);
    expect(baseReturn.generateProfile).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('renders LoadingState in PATHWAY step when loading', () => {
    mockUsePathways.mockReturnValue({
      ...baseReturn,
      currentStep: FEATURE_STEPS.PATHWAY,
      isLoading: true,
    });
    customRender(<AiPathwaysPage />);
    expect(screen.getByText('Loading...', { selector: 'div' })).toBeInTheDocument();
  });

  it('renders ErrorState in PATHWAY step when error occurs', () => {
    mockUsePathways.mockReturnValue({
      ...baseReturn,
      currentStep: FEATURE_STEPS.PATHWAY,
      error: new Error('Pathway failed'),
    });
    customRender(<AiPathwaysPage />);
    expect(screen.getByText('Pathway failed')).toBeInTheDocument();
  });

  it('renders ErrorState in PATHWAY step if no pathway available', () => {
    mockUsePathways.mockReturnValue({
      ...baseReturn,
      currentStep: FEATURE_STEPS.PATHWAY,
      pathway: null,
    });
    customRender(<AiPathwaysPage />);
    expect(screen.getByText('No pathway data available')).toBeInTheDocument();
  });

  it('renders PathwayList when pathway is available', () => {
    mockUsePathways.mockReturnValue({
      ...baseReturn,
      currentStep: FEATURE_STEPS.PATHWAY,
      pathway: { courses: [] },
    });
    customRender(<AiPathwaysPage />);
    expect(screen.getByTestId('mock-pathway-list')).toBeInTheDocument();

    // Test onAdjustPathway
    fireEvent.click(screen.getByTestId('mock-pathway-list'));
    expect(baseReturn.setCurrentStep).toHaveBeenCalledWith(FEATURE_STEPS.INTAKE);
  });

  it('renders DebugConsole when isDebug is true', () => {
    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = new URL('http://localhost?debug=true');

    mockUsePathways.mockReturnValue({
      ...baseReturn,
      currentStep: FEATURE_STEPS.INTAKE,
    });
    customRender(<AiPathwaysPage />);
    expect(screen.getByTestId('debug-console')).toBeInTheDocument();

    (window as any).location = originalLocation;
  });

  it('triggers generateProfile with interceptor when isDebug is true', () => {
    (window as any).location = new URL('http://test.com?debug=true');
    customRender(<AiPathwaysPage />);
    fireEvent.click(screen.getByTestId('mock-intake-form'));
    expect(baseReturn.generateProfile).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('handles default case in renderContent', () => {
     mockUsePathways.mockReturnValue({
      ...baseReturn,
      currentStep: 'UNKNOWN',
    });
    customRender(<AiPathwaysPage />);
    expect(screen.getByText('Not Found')).toBeInTheDocument();
  });
});
