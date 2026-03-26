import { useState, useCallback, useMemo } from 'react';
import type { CreateLearnerProfileArgs } from '../services/pathways.types';

export interface IntakePageInfo {
  title: string;
  subtitle: string;
}

export const INTAKE_PAGES: IntakePageInfo[] = [
  {
    title: "Let's start with your goals",
    subtitle: "A few thoughtful answers now mean a faster, clearer path ahead.",
  },
  {
    title: "Tell us about your background",
    subtitle: "This helps us understand your starting point.",
  },
  {
    title: "How you like to learn",
    subtitle: "We'll use this to build a learning pathway tailored to you.",
  },
  {
    title: 'Building your learning profile',
    subtitle: 'Please wait, this can take a few moments.',
  },
];

interface UseIntakeFormArgs {
  onSubmit: (data: CreateLearnerProfileArgs) => Promise<void>;
}

/**
 * Hook to manage the state and logic of the intake form.
 */
export const useIntakeForm = ({ onSubmit }: UseIntakeFormArgs) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [formData, setFormData] = useState<CreateLearnerProfileArgs>({
    bringsYouHereRes: '',
    careerGoalRes: '',
    backgroundRes: '',
    industryRes: '',
    learningPrefRes: 'async',
    timeAvailableRes: '',
    certificateRes: '',
  });

  const progress = useMemo(() => (pageIndex / (INTAKE_PAGES.length - 1)) * 100, [pageIndex]);

  const handleChange = useCallback((field: keyof CreateLearnerProfileArgs, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleNext = useCallback(async () => {
    if (pageIndex === 2) {
      setPageIndex(3);
      await onSubmit(formData);
    } else {
      setPageIndex(pageIndex + 1);
    }
  }, [pageIndex, formData, onSubmit]);

  const handleBack = useCallback(() => {
    if (pageIndex > 0) {
      setPageIndex(pageIndex - 1);
    }
  }, [pageIndex]);

  const currentPage = INTAKE_PAGES[pageIndex];

  return {
    pageIndex,
    formData,
    progress,
    currentPage,
    handleChange,
    handleNext,
    handleBack,
    setPageIndex,
  };
};
