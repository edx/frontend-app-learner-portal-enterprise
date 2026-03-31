import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AiPathwaysPage } from '../routes/AiPathwaysPage';
import { usePathways } from '../hooks/usePathways';

jest.mock('../hooks/usePathways');

const mockUsePathways = usePathways as jest.Mock;

describe('AiPathwaysPage Full Flow Test', () => {
  const mockGenerateProfile = jest.fn();
  const mockGeneratePathway = jest.fn();
  const mockSelectCareer = jest.fn();
  const mockSetCurrentStep = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathways.mockReturnValue({
      currentStep: 'intake',
      learnerProfile: null,
      selectedCareer: null,
      pathway: null,
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
    expect(screen.getByText(/Let's start with your goals/i)).toBeInTheDocument();
  });

  test('transitions to Profile page when profile is generated', () => {
    mockUsePathways.mockReturnValue({
      currentStep: 'profile',
      learnerProfile: {
        overview: 'Test Overview',
        careerGoal: 'Test Career',
        targetIndustry: 'Tech',
        background: 'Retail',
        motivation: 'Money',
        learningStyle: 'Async',
        timeAvailable: '5h',
        certificate: 'Yes',
        careerMatches: [{ title: 'Developer', percentMatch: 0.9, skills: ['JS'] }],
      },
      selectedCareer: { title: 'Developer', percentMatch: 0.9, skills: ['JS'] },
      pathway: null,
      isLoading: false,
      error: null,
      generateProfile: mockGenerateProfile,
      selectCareer: mockSelectCareer,
      generatePathway: mockGeneratePathway,
      setCurrentStep: mockSetCurrentStep,
    });

    render(<AiPathwaysPage />);
    expect(screen.getByText(/Mike Brown/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Your Profile/i })).toBeInTheDocument();
    expect(screen.getByText(/Developer/i)).toBeInTheDocument();
    expect(screen.getByText(/Build My Learning Pathway/i)).toBeInTheDocument();
  });

  test('transitions to Pathway page when pathway is generated', () => {
    mockUsePathways.mockReturnValue({
      currentStep: 'pathway',
      learnerProfile: {
        overview: 'Test Overview',
        careerGoal: 'Test Career',
        targetIndustry: 'Tech',
        background: 'Retail',
        motivation: 'Money',
        learningStyle: 'Async',
        timeAvailable: '5h',
        certificate: 'Yes',
        careerMatches: [{ title: 'Developer', percentMatch: 0.9, skills: ['JS'] }],
      },
      selectedCareer: { title: 'Developer', percentMatch: 0.9, skills: ['JS'] },
      pathway: {
        courses: [{
          title: 'Introduction to AI',
          status: 'not started',
          order: 1,
          level: 'Beginner',
          reasoning: 'Matches your goal',
          skills: ['AI'],
        }],
      },
      isLoading: false,
      error: null,
      generateProfile: mockGenerateProfile,
      selectCareer: mockSelectCareer,
      generatePathway: mockGeneratePathway,
      setCurrentStep: mockSetCurrentStep,
    });

    render(<AiPathwaysPage />);
    expect(screen.getByText(/Your Personalized Learning Pathway/i)).toBeInTheDocument();
    expect(screen.getByText(/Introduction to AI/i)).toBeInTheDocument();
  });
});
