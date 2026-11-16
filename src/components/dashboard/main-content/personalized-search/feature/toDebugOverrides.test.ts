import { defaultDebugSettings } from './personalizedSearchStore';
import { toDebugOverrides } from './usePersonalizedSearchController';

describe('toDebugOverrides', () => {
  it('is an empty object when no model is overridden, so the turn still says it is a debug turn', () => {
    expect(toDebugOverrides(defaultDebugSettings())).toEqual({});
  });

  it('carries each overridden step with its effort', () => {
    expect(toDebugOverrides({ ...defaultDebugSettings(), composeModel: 'gpt-6.1-terra', composeEffort: 'low' }))
      .toEqual({ compose_model: 'gpt-6.1-terra', compose_effort: 'low' });
  });
});
