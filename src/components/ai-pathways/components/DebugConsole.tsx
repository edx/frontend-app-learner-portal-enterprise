import React from 'react';
import {
  Card,
  Badge,
  Stack,
  Alert,
} from '@openedx/paragon';
import { AIPathwaysResponseModel } from '../types';

interface DebugConsoleProps {
  response: AIPathwaysResponseModel | null;
}

export const DebugConsole = ({ response }: DebugConsoleProps) => {
  if (!response) {
    return null;
  }

  const { stages } = response;

  return (
    <Card className="mt-5 border-warning">
      <Card.Header
        title="AI Pathways Debug Console"
        subtitle={`Request ID: ${response.requestId}`}
      />
      <Card.Body>
        <Stack gap={3}>
          {/* Facet Bootstrap */}
          <details open>
            <summary className="h5 cursor-pointer py-2 border-bottom d-flex align-items-center justify-content-between">
              <span>Stage 1: Facet Bootstrap</span>
              <Badge variant={stages.facetBootstrap?.success ? 'success' : 'danger'}>
                {stages.facetBootstrap?.durationMs}ms
              </Badge>
            </summary>
            <div className="py-2">
              <pre className="small bg-light p-2">
                {JSON.stringify(stages.facetBootstrap, null, 2)}
              </pre>
            </div>
          </details>

          {/* Intent Extraction */}
          <details>
            <summary className="h5 cursor-pointer py-2 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <span>Stage 2: Xpert Intent Extraction</span>
                {stages.intentExtraction?.repairPromptUsed && (
                  <Badge variant="warning" className="ml-2">Repaired</Badge>
                )}
              </div>
              <Badge variant={stages.intentExtraction?.success ? 'success' : 'danger'}>
                {stages.intentExtraction?.durationMs}ms
              </Badge>
            </summary>
            <div className="py-2">
              <Stack gap={3}>
                {stages.intentExtraction?.validationErrors?.length > 0 && (
                  <Alert variant="danger">
                    <strong>Validation Errors:</strong>
                    <ul>
                      {stages.intentExtraction.validationErrors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
                <div>
                  <strong>System Prompt:</strong>
                  <pre className="small bg-light p-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {stages.intentExtraction?.systemPrompt}
                  </pre>
                </div>
                <div>
                  <strong>Raw Response:</strong>
                  <pre className="small bg-light p-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {stages.intentExtraction?.rawResponse}
                  </pre>
                </div>
                <div>
                  <strong>Parsed Intent:</strong>
                  <pre className="small bg-light p-2">
                    {JSON.stringify(stages.intentExtraction?.parsedResponse, null, 2)}
                  </pre>
                </div>
              </Stack>
            </div>
          </details>

          {/* Career Retrieval */}
          <details>
            <summary className="h5 cursor-pointer py-2 border-bottom d-flex align-items-center justify-content-between">
              <span>Stage 3: Career Retrieval (Algolia)</span>
              <div>
                <Badge variant="info" className="mr-2">{stages.careerRetrieval?.resultCount} hits</Badge>
                <Badge variant={stages.careerRetrieval?.success ? 'success' : 'danger'}>
                  {stages.careerRetrieval?.durationMs}ms
                </Badge>
              </div>
            </summary>
            <div className="py-2">
              <pre className="small bg-light p-2">
                {JSON.stringify(stages.careerRetrieval, null, 2)}
              </pre>
            </div>
          </details>

          {/* Course Retrieval */}
          <details>
            <summary className="h5 cursor-pointer py-2 border-bottom d-flex align-items-center justify-content-between">
              <span>Stage 4: Course Retrieval (Algolia)</span>
              <div>
                <Badge variant="info" className="mr-2">{stages.courseRetrieval?.resultCount} hits</Badge>
                <Badge variant={stages.courseRetrieval?.success ? 'success' : 'danger'}>
                  {stages.courseRetrieval?.durationMs}ms
                </Badge>
              </div>
            </summary>
            <div className="py-2">
              <pre className="small bg-light p-2">
                {JSON.stringify(stages.courseRetrieval, null, 2)}
              </pre>
            </div>
          </details>

          {/* Pathway Enrichment */}
          <details>
            <summary className="h5 cursor-pointer py-2 border-bottom d-flex align-items-center justify-content-between">
              <span>Stage 5: Xpert Pathway Enrichment</span>
              <Badge variant={stages.pathwayEnrichment?.success ? 'success' : 'danger'}>
                {stages.pathwayEnrichment?.durationMs}ms
              </Badge>
            </summary>
            <div className="py-2">
              <Stack gap={3}>
                <div>
                  <strong>System Prompt:</strong>
                  <pre className="small bg-light p-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {stages.pathwayEnrichment?.systemPrompt}
                  </pre>
                </div>
                <div>
                  <strong>Raw Response:</strong>
                  <pre className="small bg-light p-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {stages.pathwayEnrichment?.rawResponse}
                  </pre>
                </div>
              </Stack>
            </div>
          </details>
        </Stack>
      </Card.Body>
    </Card>
  );
};
