export interface XpertExtractionResult {
  intent: any;
  debug: {
    systemPrompt: string;
    rawResponse: string;
    parsedResponse: any;
    validationErrors: string[];
    repairPromptUsed: boolean;
    durationMs: number;
    success: boolean;
    tags?: string[];
    discovery?: any;
    wasDiscoveryUsed?: boolean;
  };
}

export interface XpertEnrichmentResult {
  pathway: any;
  debug: {
    systemPrompt: string;
    rawResponse: string;
    durationMs: number;
    success: boolean;
    tags?: string[];
    discovery?: any;
    wasDiscoveryUsed?: boolean;
  };
}
