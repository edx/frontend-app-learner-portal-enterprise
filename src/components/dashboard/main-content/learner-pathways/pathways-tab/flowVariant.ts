import type { PathwayGenerationMode, PathwaysSection } from './state';

export type PathwaysFlowVariant = 'career' | 'skills';

/**
 * A one-shot input read at Intake submission time — not navigation/step state (ADR 0020
 * reserves query params from representing `section`), and never written back to the URL.
 */
export const PATHWAYS_FLOW_QUERY_PARAM = 'pathwayMode';

const CAREER_FLOW_VALUE = 'career';

/**
 * Pure parser: skills-driven Algolia retrieval is the default, no-query-param production
 * behavior. Anything other than exactly `pathwayMode=career` resolves to `skills`.
 * Accepts the search source explicitly (never reads `window`) so it works identically
 * from a component via `useSearchParams()` and from plain unit tests.
 */
export const parsePathwaysFlowVariant = (
  search: URLSearchParams | string,
): PathwaysFlowVariant => {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  return params.get(PATHWAYS_FLOW_QUERY_PARAM) === CAREER_FLOW_VALUE ? 'career' : 'skills';
};

export interface PathwaysFlowConflictInput {
  section: PathwaysSection;
  pathwayGenerationMode: PathwayGenerationMode | null;
  flowVariant: PathwaysFlowVariant;
}

/**
 * Whether the section the learner would durably land on belongs to a different flow than
 * the active `?pathwayMode` variant. Pure (no store, no `window`, no URL) so a component
 * can apply it as a render-time override and unit tests can exercise every combination
 * directly.
 *
 * Two distinct conflicts:
 *  1. Skills mode has no Career Profile step at all, so `'profile'` is never a valid
 *     section under the skills variant — regardless of `pathwayGenerationMode`, which is
 *     still `null` for a learner who hasn't built anything yet and therefore cannot
 *     detect this case on its own.
 *  2. A built pathway belongs to the flow that built it: showing a career-mode pathway
 *     under skills-mode chrome (a two-step breadcrumb, a "Retake quiz" leading action, no
 *     fixture fallback) — or the reverse — would misrepresent it. `null` is not a
 *     conflict: a pre-existing/legacy pathway carries no mode and stays visible.
 *
 * The career variant on `'profile'` is emphatically not a conflict — that is that flow's
 * own step.
 */
export const hasPathwaysFlowConflict = (
  { section, pathwayGenerationMode, flowVariant }: PathwaysFlowConflictInput,
): boolean => {
  if (flowVariant === 'skills' && section === 'profile') {
    return true;
  }
  return section === 'pathway'
    && pathwayGenerationMode !== null
    && pathwayGenerationMode !== flowVariant;
};
