/**
 * Service-layer contracts for future external integration.
 * No implementations are added in this scaffold ticket.
 */

export interface PathwayGenerationRequest {
  [key: string]: unknown;
}

export interface LearnerProfileGenerationRequest {
  [key: string]: unknown;
}

export interface PathwaysServiceContracts {
  generateLearnerProfile: (
    request: LearnerProfileGenerationRequest,
  ) => Promise<unknown>;
  generatePathway: (request: PathwayGenerationRequest) => Promise<unknown>;
}
