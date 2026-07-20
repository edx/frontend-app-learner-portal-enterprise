import { buildGiveFeedbackAction } from './giveFeedbackAction';

describe('buildGiveFeedbackAction', () => {
  it('returns null when feedbackFormUrl is falsy', () => {
    expect(buildGiveFeedbackAction(null)).toBeNull();
    expect(buildGiveFeedbackAction('')).toBeNull();
  });

  it('returns a PathwaysAction pointing at the configured URL when truthy', () => {
    const action = buildGiveFeedbackAction('https://example.com/form');
    expect(action).toMatchObject({
      id: 'pathway-feedback',
      destination: 'https://example.com/form',
      target: '_blank',
      testId: 'pathway-feedback-button',
    });
    expect(action?.label).toBeDefined();
  });
});
