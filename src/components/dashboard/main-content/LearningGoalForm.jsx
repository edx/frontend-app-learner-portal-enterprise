import { useState } from 'react';
import { Button } from '@openedx/paragon';

const LearningGoalForm = ({ className }) => {
  const [goalHours, setGoalHours] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    // TODO: wire this up to a real endpoint once the backend supports it.
    setTimeout(() => {
      console.log('saved weekly learning goal', goalHours);
      setIsSubmitting(false);
      setStatus('success');
    }, 800);
  };

  return (
    <div className={className}>
      <div className="mb-1 font-weight-bold">Weekly learning goal (hours)</div>
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          min="0"
          value={goalHours}
          onChange={e => setGoalHours(e.target.value)}
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </form>
      {status === 'success' && (
        <p style={{ color: 'green' }}>Saved!</p>
      )}
    </div>
  );
};

export default LearningGoalForm;
