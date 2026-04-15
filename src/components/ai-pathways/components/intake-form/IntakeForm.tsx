import React from 'react';
import {
  Form,
  Button,
  ProgressBar,
  Card,
  Spinner,
} from '@openedx/paragon';
import type { CreateLearnerProfileArgs } from '../../types';
import { useIntakeForm } from '../../hooks/useIntakeForm';
import {
  LEARNING_STYLE_OPTIONS,
  TIME_AVAILABILITY_OPTIONS,
  CERTIFICATE_PREFERENCE_OPTIONS,
  INTAKE_STEPS,
} from '../../constants';

interface IntakeFormProps {
  /** Callback when the form is submitted and processing begins */
  onSubmit: (data: CreateLearnerProfileArgs) => Promise<void>;
  /** Whether the form is currently submitting/processing */
  isSubmitting?: boolean;
}

/**
 * IntakeForm component manages the multi-step questionnaire for generating
 * a learner profile. It is converted from Ionic to Paragon.
 */
export const IntakeForm = ({ onSubmit, isSubmitting = false }: IntakeFormProps) => {
  const {
    pageIndex,
    formData,
    progress,
    currentPage,
    handleChange,
    handleNext,
    handleBack,
  } = useIntakeForm({ onSubmit });

  const renderPageContent = () => {
    switch (pageIndex) {
      case INTAKE_STEPS.GOALS:
        return (
          <>
            <Form.Group className="mb-4">
              <Form.Label>What brings you here today?</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Example: I'm looking to transition into a new career, upskill my current role, or explore a personal interest..."
                value={formData.bringsYouHereRes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('bringsYouHereRes', e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>What career would you like us to help you achieve?</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="UX Designer, Data Analyst, Project Manager, Software Developer..."
                value={formData.careerGoalRes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('careerGoalRes', e.target.value)}
              />
            </Form.Group>
          </>
        );
      case INTAKE_STEPS.BACKGROUND:
        return (
          <>
            <Form.Group className="mb-4">
              <Form.Label>
                What&apos;s your current background or role? What relevant skills or experience do you have?
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Example: I've been working in retail management for 5 years and have strong communication skills..."
                value={formData.backgroundRes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('backgroundRes', e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Which industry or field are you most interested in?</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Technology, Healthcare, Finance, Education, Creative Arts..."
                value={formData.industryRes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('industryRes', e.target.value)}
              />
            </Form.Group>
          </>
        );
      case INTAKE_STEPS.PREFERENCES:
        return (
          <>
            <Form.Group className="mb-4">
              <Form.Label>How do you prefer to learn?</Form.Label>
              {LEARNING_STYLE_OPTIONS.map((option) => (
                <Form.Radio
                  key={option.value}
                  name="learningPref"
                  id={`pref-${option.value}`}
                  checked={formData.learningPrefRes === option.value}
                  onChange={() => handleChange('learningPrefRes', option.value)}
                  className="mb-2"
                >
                  <div>
                    <strong>{option.label}</strong>
                    <div className="small text-muted">{option.description}</div>
                  </div>
                </Form.Radio>
              ))}
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>How much time can you dedicate to learning each week?</Form.Label>
              <Form.Control
                as="select"
                value={formData.timeAvailableRes}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('timeAvailableRes', e.target.value)}
              >
                <option value="">Select your availability</option>
                {TIME_AVAILABILITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Form.Control>
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Are you interested in a certificate or credentials?</Form.Label>
              <Form.Control
                as="select"
                value={formData.certificateRes}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('certificateRes', e.target.value)}
              >
                <option value="">Select your preference</option>
                {CERTIFICATE_PREFERENCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Form.Control>
            </Form.Group>
          </>
        );
      case INTAKE_STEPS.PROCESSING:
        return (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
            <p className="mt-3 text-muted">Analyzing your goals and building your profile...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto" style={{ maxWidth: '800px' }}>
      <div className="text-center mb-5">
        <h2 className="h3 font-weight-bold">Welcome to Your Learning Journey</h2>
        <p className="text-muted">
          Every learner&apos;s path looks a little different — this quick intake helps us shape yours.
        </p>
      </div>

      <ProgressBar now={progress} className="mb-4" />

      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h3 className="h4 font-weight-bold mb-2">
            {currentPage.title}
          </h3>
          <p className="mb-4 text-muted">
            {currentPage.subtitle}
          </p>

          <Form>
            {renderPageContent()}

            {pageIndex < INTAKE_STEPS.PROCESSING && (
              <div className="d-flex justify-content-between mt-4">
                <Button
                  variant="outline-primary"
                  onClick={handleBack}
                  disabled={pageIndex === INTAKE_STEPS.GOALS || isSubmitting}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={isSubmitting}
                >
                  {pageIndex === INTAKE_STEPS.PREFERENCES ? 'Submit' : 'Continue'}
                </Button>
              </div>
            )}
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};
