import { reconcileDebugSettings } from './reconcileDebugSettings';

const config = {
  models: [
    {
      id: 'gpt-4.1-mini', price_in: 0.4, price_cached_in: 0.1, price_out: 1.6, efforts: [null],
    },
    {
      id: 'gpt-5.4-mini', price_in: 0.75, price_cached_in: 0.075, price_out: 4.5, efforts: ['low', 'medium'],
    },
  ],
  defaults: {
    intent_model: 'gpt-4.1-mini', intent_effort: null, compose_model: 'gpt-5.4-mini', compose_effort: 'low',
  },
  catalog: 'c',
};
const settings = (over = {}) => ({
  live: true, intentModel: null, intentEffort: null, composeModel: null, composeEffort: null, ...over,
});

describe('reconcileDebugSettings', () => {
  it('keeps offered models and efforts', () => {
    expect(reconcileDebugSettings(settings({ composeModel: 'gpt-5.4-mini', composeEffort: 'medium' }), config)).toEqual({});
    expect(reconcileDebugSettings(settings(), config)).toEqual({});
  });

  it('drops a model the server no longer offers, with its effort', () => {
    expect(reconcileDebugSettings(settings({ intentModel: 'xpert', intentEffort: 'low' }), config))
      .toEqual({ intentModel: null, intentEffort: null });
  });

  it('drops an effort the model no longer accepts', () => {
    expect(reconcileDebugSettings(settings({ composeModel: 'gpt-5.4-mini', composeEffort: 'high' }), config))
      .toEqual({ composeEffort: null });
  });
});
