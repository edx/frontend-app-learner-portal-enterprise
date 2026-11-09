// NOTE: no backend endpoint exists for this yet; this simulates a save so the
// UI/data-layer separation is in place ahead of the real API integration.
export const saveWeeklyLearningGoal = (goalHours) => new Promise((resolve) => {
  setTimeout(() => resolve({ goalHours }), 800);
});
