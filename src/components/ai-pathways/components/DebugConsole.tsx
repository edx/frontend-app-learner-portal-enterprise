import React from 'react';
import {
  Card,
  Badge,
  Stack,
  Alert,
} from '@openedx/paragon';
import {
  AIPathwaysResponseModel,
  FacetSnapshotTrace,
  RulesFirstMappingTrace,
  CatalogTranslationTrace,
  RetrievalLadderTrace,
} from '../types';

interface DebugConsoleProps {
  response: AIPathwaysResponseModel | null;
}

const FacetSnapshotSection = ({ trace }: { trace: FacetSnapshotTrace }) => (
  <div>
    <p className="mb-1"><strong>skill_names:</strong> {trace.skillNamesCount} values — sample: {trace.sampleSkillNames.join(', ')}</p>
    <p className="mb-1"><strong>skills.name:</strong> {trace.skillsDotNameCount} values</p>
    <p className="mb-1"><strong>subjects:</strong> {trace.subjectsCount} values — sample: {trace.sampleSubjects.join(', ')}</p>
    <p className="mb-1"><strong>level_type:</strong> {trace.levelTypeCount} values</p>
    <p className="mb-0"><strong>partners.name:</strong> {trace.partnersNameCount} values</p>
  </div>
);

const RulesFirstSection = ({ trace }: { trace: RulesFirstMappingTrace }) => (
  <div>
    <p className="mb-1"><strong>Terms considered:</strong> {trace.termsConsidered}</p>
    <p className="mb-1"><strong>Exact matches ({trace.exactMatchCount}):</strong> {trace.exactMatches.join(', ') || '—'}</p>
    <p className="mb-1"><strong>Alias matches ({trace.aliasMatchCount}):</strong> {trace.aliasMatches.join(', ') || '—'}</p>
    <p className="mb-0"><strong>Unmatched ({trace.unmatchedCount}):</strong> {trace.unmatched.join(', ') || '—'}</p>
  </div>
);

const CatalogTranslationSection = ({ trace }: { trace: CatalogTranslationTrace }) => (
  <Stack gap={2}>
    <p className="mb-1"><strong>Query:</strong> {trace.query}</p>
    {trace.queryAlternates.length > 0 && (
      <p className="mb-1"><strong>Alternates:</strong> {trace.queryAlternates.join(', ')}</p>
    )}
    <p className="mb-1">
      <strong>Strict skills ({trace.strictSkillCount}):</strong> {trace.strictSkills.join(', ') || '—'}
    </p>
    <p className="mb-1">
      <strong>Boost skills ({trace.boostSkillCount}):</strong> {trace.boostSkills.join(', ') || '—'}
    </p>
    <p className="mb-1">
      <strong>Subject hints ({trace.subjectHintCount}):</strong> {trace.subjectHints.join(', ') || '—'}
    </p>
    <p className="mb-1"><strong>Dropped skills ({trace.droppedSkillCount})</strong></p>
    <p className="mb-1"><strong>Xpert used:</strong> {trace.xpertUsed ? 'Yes' : 'No'}</p>
    {trace.xpertUsed && (
      <>
        <p className="mb-1"><strong>Xpert duration:</strong> {trace.xpertDurationMs}ms — {trace.xpertSuccess ? 'success' : 'failed'}</p>
        <div>
          <strong>Xpert system prompt:</strong>
          <pre className="small bg-light p-2" style={{ whiteSpace: 'pre-wrap' }}>{trace.xpertSystemPrompt}</pre>
        </div>
        <div>
          <strong>Xpert raw response:</strong>
          <pre className="small bg-light p-2" style={{ whiteSpace: 'pre-wrap' }}>{trace.xpertRawResponse}</pre>
        </div>
      </>
    )}
  </Stack>
);

const RetrievalLadderSection = ({ trace }: { trace: RetrievalLadderTrace }) => (
  <Stack gap={2}>
    <p className="mb-1"><strong>Winner step:</strong> {trace.winnerStep ?? 'none'}</p>
    {trace.attempts.map((attempt) => (
      <div key={`${attempt.step}-${attempt.label}`} className="border rounded p-2">
        <Badge variant={attempt.winner ? 'success' : 'secondary'} className="mr-2">Step {attempt.step}</Badge>
        <strong>{attempt.label}</strong>
        <span className="ml-2 text-muted">— {attempt.hitCount} hits</span>
        {attempt.query && <p className="mb-0 mt-1 small"><strong>Query:</strong> {attempt.query}</p>}
      </div>
    ))}
  </Stack>
);

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

          {/* Facet Snapshot */}
          {stages.catalogFacetSnapshot && (
            <details>
              <summary className="h5 cursor-pointer py-2 border-bottom d-flex align-items-center justify-content-between">
                <span>Stage 3b: Catalog Facet Snapshot</span>
                <Badge variant={stages.catalogFacetSnapshot.success ? 'success' : 'danger'}>
                  {stages.catalogFacetSnapshot.durationMs}ms
                </Badge>
              </summary>
              <div className="py-2">
                <FacetSnapshotSection trace={stages.catalogFacetSnapshot.trace} />
              </div>
            </details>
          )}

          {/* Rules-First Mapping */}
          {stages.rulesFirstMapping && (
            <details>
              <summary className="h5 cursor-pointer py-2 border-bottom d-flex align-items-center justify-content-between">
                <span>Stage 3c: Rules-First Taxonomy Mapping</span>
                <Badge variant={stages.rulesFirstMapping.success ? 'success' : 'danger'}>
                  {stages.rulesFirstMapping.durationMs}ms
                </Badge>
              </summary>
              <div className="py-2">
                <RulesFirstSection trace={stages.rulesFirstMapping.trace} />
              </div>
            </details>
          )}

          {/* Catalog Translation */}
          {stages.catalogTranslation && (
            <details>
              <summary className="h5 cursor-pointer py-2 border-bottom d-flex align-items-center justify-content-between">
                <span>Stage 3d: Catalog Translation</span>
                <Badge variant={stages.catalogTranslation.success ? 'success' : 'danger'}>
                  {stages.catalogTranslation.durationMs}ms
                </Badge>
              </summary>
              <div className="py-2">
                <CatalogTranslationSection trace={stages.catalogTranslation.trace} />
              </div>
            </details>
          )}

          {/* Retrieval Ladder */}
          {stages.retrievalLadder && (
            <details>
              <summary className="h5 cursor-pointer py-2 border-bottom d-flex align-items-center justify-content-between">
                <span>Stage 4a: Course Retrieval Ladder</span>
                <Badge variant={stages.retrievalLadder.success ? 'success' : 'danger'}>
                  {stages.retrievalLadder.trace.attempts.length} attempts
                </Badge>
              </summary>
              <div className="py-2">
                <RetrievalLadderSection trace={stages.retrievalLadder.trace} />
              </div>
            </details>
          )}

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
