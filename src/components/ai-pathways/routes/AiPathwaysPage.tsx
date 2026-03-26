import React, { useMemo } from 'react';
import { usePathways } from '../hooks/usePathways';
import {
  PathwayList,
  LoadingState,
  ErrorState,
  IntakeForm,
  UserProfile,
} from '../components';

/**
 * AiPathwaysPage is the top-level entry point for the AI Pathways feature.
 *
 * It manages the high-level state of the feature slice and coordinates
 * rendering of its sub-pages (Intake, Profile, and Learning Pathway)
 * using the usePathways hook to drive the interaction flow.
 */
export const AiPathwaysPage = () => {
  const {
    currentStep,
    learnerProfile,
    selectedCareer,
    pathway,
    isLoading,
    error,
    generateProfile,
    selectCareer,
    generatePathway,
    setCurrentStep,
  } = usePathways();

  const renderContent = useMemo(() => {
    switch (currentStep) {
      case 'intake':
        return (
          <IntakeForm
            onSubmit={generateProfile}
            isSubmitting={isLoading}
          />
        );
      case 'profile':
        if (isLoading) return <LoadingState />;
        if (!learnerProfile) return <ErrorState message="No profile found" />;
        return (
          <UserProfile
            profile={learnerProfile}
            selectedCareer={selectedCareer}
            onSelectCareer={selectCareer}
            onBuildPathway={generatePathway}
            isGenerating={isLoading}
          />
        );
      case 'pathway':
        if (isLoading) return <LoadingState />;
        if (error) return <ErrorState message={error.message} />;
        if (!pathway) return <ErrorState message="No pathway found" />;
        return (
          <PathwayList
            pathway={pathway}
            onAdjustPathway={() => setCurrentStep('intake')}
          />
        );
      default:
        return <div>Not Found</div>;
    }
  }, [
    currentStep,
    learnerProfile,
    selectedCareer,
    pathway,
    isLoading,
    error,
    generateProfile,
    selectCareer,
    generatePathway,
    setCurrentStep,
  ]);

  return (
    <div className="ai-pathways-page pb-5">
      <div className="py-4">
        <header className="mb-4">
          <h2 className="h3 font-weight-bold">AI Learning Pathways</h2>
          <p className="text-muted">A personalized prototype for AI-generated learning roadmaps.</p>
        </header>
        <main>
          {renderContent}
        </main>
      </div>
    </div>
  );
};
