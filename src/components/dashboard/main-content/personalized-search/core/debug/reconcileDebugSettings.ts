import type { DebugConfig } from '../api/debug';
import type { DebugSettings } from '../state';

type ModelKeys = ['intentModel', 'intentEffort'] | ['composeModel', 'composeEffort'];

/**
 * Drops saved debug model choices the server no longer offers. A select can't show a value missing
 * from its options, so a stale saved model would display as "Server default" while every turn kept
 * sending it, and choosing "Server default" again wouldn't fire a change. Returns only what changes.
 */
export const reconcileDebugSettings = (settings: DebugSettings, config: DebugConfig): Partial<DebugSettings> => {
  const changes: Partial<DebugSettings> = {};
  ([['intentModel', 'intentEffort'], ['composeModel', 'composeEffort']] as ModelKeys[]).forEach(([modelKey, effortKey]) => {
    const model = settings[modelKey];
    if (!model) { return; }
    const offered = config.models.find((m) => m.id === model);
    if (!offered) {
      Object.assign(changes, { [modelKey]: null, [effortKey]: null });
    } else if (settings[effortKey] && !offered.efforts.includes(settings[effortKey])) {
      Object.assign(changes, { [effortKey]: null });
    }
  });
  return changes;
};
