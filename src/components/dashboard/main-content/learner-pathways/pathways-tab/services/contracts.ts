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

/**
 * Typed subset of CareerMatch returned by the career-matching service.
 * TODO: Narrow this contract when backend endpoint shape is finalized.
 */
export interface CareerMatchResult {
  id: string;
  title: string;
  matchPercentage?: number;
  laborMarketTrend?: string;
  skillsToDevelop?: string[];
}

/**
 * Career-match service contracts for future Algolia / intent-service integration.
 * TODO: Replace LearnerProfileGenerationRequest with the finalized request type.
 */
export interface CareerMatchServiceContracts {
  fetchCareerMatches: (
    profilePayload: LearnerProfileGenerationRequest,
  ) => Promise<CareerMatchResult[]>;
}
