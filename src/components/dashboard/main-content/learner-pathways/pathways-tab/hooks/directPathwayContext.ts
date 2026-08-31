/**
 * Direct-flow pre-flight failure. `usePathwaysController.generateDirectPathway` rejects
 * with this *before* any external call whenever the enterprise context it needs cannot be
 * resolved: without an enterprise customer UUID and at least one catalog UUID, the
 * Enterprise Catalog inclusion check has nothing to scope against, so a candidate pool
 * retrieved from Xpert could never be narrowed to catalog-eligible courses. Failing here
 * costs zero network calls, rather than paying for an Xpert round-trip and then throwing
 * `EnterpriseCatalogInclusionError` one step later.
 *
 * A single named constant/error (not an inline string) so the controller, the tab, and
 * their tests all reference one source of truth.
 */
export const DIRECT_PATHWAY_CONTEXT_UNAVAILABLE_MESSAGE = "Your organization's catalog information is unavailable, so recommendations cannot be generated right now.";

export class DirectPathwayContextUnavailableError extends Error {
  constructor() {
    super(DIRECT_PATHWAY_CONTEXT_UNAVAILABLE_MESSAGE);
    this.name = 'DirectPathwayContextUnavailableError';
  }
}
