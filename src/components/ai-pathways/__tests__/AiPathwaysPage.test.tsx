import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { AiPathwaysPage } from '../routes/AiPathwaysPage';
import { usePathways } from '../hooks/usePathways';
import * as appUtils from '../../app/data/utils';
import {
  mockLearnerProfile,
  mockPathwayResponse,
} from './fixtures';

jest.mock('../hooks/usePathways');

const mockUsePathways = usePathways as jest.Mock;

describe('AiPathwaysPage Full Flow Test', () => {
  const mockGenerateProfile = jest.fn();
  const mockGeneratePathway = jest.fn();
  const mockSelectCareer = jest.fn();
  const mockSetCurrentStep = jest.fn();

  beforeEach(() => {
    jest.spyOn(appUtils, 'getSupportedLocale').mockReturnValue('en');
    jest.clearAllMocks();
    mockUsePathways.mockReturnValue({
      currentStep: 'intake',
      learnerProfile: null,
      selectedCareer: null,
      pathway: null,
      pathwayResponse: null,
      isLoading: false,
      error: null,
      generateProfile: mockGenerateProfile,
      selectCareer: mockSelectCareer,
      generatePathway: mockGeneratePathway,
      setCurrentStep: mockSetCurrentStep,
    });
  });

  test('renders the main heading and the intake form by default', () => {
    render(<AiPathwaysPage />);
    expect(screen.getByText(/AI Learning Pathways/i)).toBeInTheDocument();
    expect(screen.getByText(/Welcome to Your Learning Journey/i)).toBeInTheDocument();
  });

  test('shows debug component when ?debug=true is present', () => {
    window.history.pushState({}, '', '/?debug=true');
    render(<AiPathwaysPage />);
    expect(screen.getByTestId('debug-console')).toBeInTheDocument();
  });

  test('transitions to Profile page when profile is generated', () => {
    mockUsePathways.mockReturnValue({
      currentStep: 'profile',
      learnerProfile: {
        ...mockLearnerProfile,
        careerMatches: [{ title: 'Software Engineer', percentMatch: 0.9, skills: ['JS'] }],
      },
      selectedCareer: { title: 'Software Engineer', percentMatch: 0.9, skills: ['JS'] },
      pathway: null,
      isLoading: false,
      error: null,
      generateProfile: mockGenerateProfile,
      selectCareer: mockSelectCareer,
      generatePathway: mockGeneratePathway,
      setCurrentStep: mockSetCurrentStep,
    });

    render(<AiPathwaysPage />);
    expect(screen.getAllByText(/Software Engineer/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Build My Learning Pathway/i)).toBeInTheDocument();
  });

  test('transitions to Pathway page when pathway is generated', () => {
    mockUsePathways.mockReturnValue({
      currentStep: 'pathway',
      learnerProfile: mockLearnerProfile,
      selectedCareer: { title: 'Software Engineer', percentMatch: 0.9, skills: ['JS'] },
      pathway: {
        courses: [{
          id: 'course-1', title: 'Modern React', status: 'not started', skills: ['React'],
        }],
      },
      pathwayResponse: mockPathwayResponse,
      isLoading: false,
      error: null,
      generateProfile: mockGenerateProfile,
      selectCareer: mockSelectCareer,
      generatePathway: mockGeneratePathway,
      setCurrentStep: mockSetCurrentStep,
    });

    render(<AiPathwaysPage />);
    expect(screen.getByText(/Modern React/i)).toBeInTheDocument();
  });
});

// Mock components that might be too complex for simple integration test
jest.mock('../components', () => ({
  ...jest.requireActual('../components'),
  DebugConsole: () => <div data-testid="debug-console">Debug</div>,
}));
