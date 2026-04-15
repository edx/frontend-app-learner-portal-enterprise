import { useState, useCallback, useMemo } from 'react';
import type { CreateLearnerProfileArgs } from '../types';
import { INTAKE_PAGES, INTAKE_STEPS } from '../constants';

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
    if (pageIndex === INTAKE_STEPS.PREFERENCES) {
      setPageIndex(INTAKE_STEPS.PROCESSING);
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
