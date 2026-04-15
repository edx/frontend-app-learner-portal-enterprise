import React, { useCallback } from 'react';
import {
  Card,
  Badge,
  Button,
  Stack,
  Alert,
  CardCarousel,
} from '@openedx/paragon';
import {
  AIPathwaysResponseModel,
  FacetSnapshotTrace,
  RulesFirstMappingTrace,
  CatalogTranslationTrace,
  RetrievalLadderTrace,
  PromptDebugEntry,
  CourseRetrievalHit,
} from '../types';
import { exportResponseModel } from '../utils/exportResponseModel';
import SearchCourseCard from '../../search/SearchCourseCard';
import { mapRetrievalHitToSearchCard } from '../utils/courseMapper';
import { CARDGRID_COLUMN_SIZES } from '../../search/constants';

const CourseRetrievalSection = ({ hits }: { hits: CourseRetrievalHit[] }) => {
  if (hits.length === 0) {
    return <p className="text-muted font-italic small">No courses returned for the winning step.</p>;
  }
  return (
    <div className="d-flex flex-wrap mt-3">
      {hits.map((hit) => (
        <div key={hit.objectID} style={{ width: '300px' }} className="mr-3 mb-3">
          <SearchCourseCard
            hit={mapRetrievalHitToSearchCard(hit)}
            parentRoute={{ label: 'AI Pathways Debug', to: '#' }}
          />
        </div>
      ))}
    </div>
  );
};

const StepCarousel = ({ hits, label }: { hits: CourseRetrievalHit[], label: string }) => {
  if (hits.length === 0) { return null; }

  return (
    <div className="mt-2 border-top pt-2">
      <p className="small text-muted mb-2">Returned Courses:</p>
      <CardCarousel
        ariaLabel={`${label} courses carousel`}
        columnSizes={CARDGRID_COLUMN_SIZES}
        hasInteractiveChildren
      >
        {hits.map((hit) => (
          <div key={hit.objectID} className="h-100 pb-3">
            <SearchCourseCard
              hit={mapRetrievalHitToSearchCard(hit)}
              parentRoute={{ label: 'AI Pathways Debug', to: '#' }}
            />
          </div>
        ))}
      </CardCarousel>
    </div>
  );
};

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

const decisionBadgeVariant = (decision: PromptDebugEntry['decision']) => {
  if (decision === 'accepted') { return 'success'; }
  if (decision === 'rejected') { return 'warning'; }
  return 'danger';
};

const PromptDebugSection = ({ entries }: { entries: PromptDebugEntry[] }) => (
  <Stack gap={3}>
    {entries.map((entry, idx) => (
      // eslint-disable-next-line react/no-array-index-key
      <div key={`${entry.label}-${idx}`} className="border rounded p-2">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <strong>{entry.label}</strong>
          <div>
            <Badge variant={decisionBadgeVariant(entry.decision)} className="mr-2">
              {entry.decision}
            </Badge>
            <span className="small text-muted">{entry.timestamp}</span>
          </div>
        </div>
        <details>
          <summary className="small cursor-pointer">Original prompt ({entry.original.stage})</summary>
          <pre className="small bg-light p-2 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
            {entry.original.combined}
          </pre>
        </details>
        {entry.edited && (
          <details className="mt-1">
            <summary className="small cursor-pointer text-warning">Edited prompt (sent to Xpert)</summary>
            <pre className="small bg-light p-2 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
              {entry.edited.combined}
            </pre>
          </details>
        )}
        {entry.validationWarnings && entry.validationWarnings.length > 0 && (
          <div className="mt-2">
            <strong className="small">Validation issues:</strong>
            <ul className="mb-0 mt-1 small">
              {entry.validationWarnings.map((w) => (
                <li key={`${w.code}-${w.severity}`} className={w.severity === 'error' ? 'text-danger' : 'text-warning'}>
                  <Badge variant={w.severity === 'error' ? 'danger' : 'warning'} className="mr-1">{w.severity}</Badge>
                  [{w.code}] {w.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ))}
  </Stack>
);

const RetrievalLadderSection = ({ trace }: { trace: RetrievalLadderTrace }) => (
  <Stack gap={2}>
    <p className="mb-1"><strong>Winner step:</strong> {trace.winnerStep ?? 'none'}</p>
    {trace.attempts.map((attempt) => (
      <div key={`${attempt.step}-${attempt.label}`} className="border rounded p-2">
        <div className="d-flex align-items-center mb-1">
          <Badge variant={attempt.winner ? 'success' : 'secondary'} className="mr-2">Step {attempt.step}</Badge>
          <strong>{attempt.label}</strong>
          <span className="ml-2 text-muted">— {attempt.hitCount} hits</span>
        </div>
        {attempt.query && <p className="mb-0 small text-truncate"><strong>Query:</strong> {attempt.query}</p>}
        {attempt.hits && attempt.hits.length > 0 && (
          <StepCarousel hits={attempt.hits} label={attempt.label} />
        )}
      </div>
    ))}
  </Stack>
);

export const DebugConsole = ({ response }: DebugConsoleProps) => {
  const handleExport = useCallback(() => {
    if (response) {
      exportResponseModel(response);
    }
  }, [response]);

  if (!response) {
    return null;
  }

  const { stages } = response;

  return (
    <Card className="mt-5 border-warning">
      <Card.Header
        title="AI Pathways Debug Console"
        subtitle={`Request ID: ${response.requestId}`}
        actions={(
          <Button
            variant="outline-primary"
            size="sm"
            onClick={handleExport}
          >
            Export JSON
          </Button>
        )}
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
          <details open>
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
              <CourseRetrievalSection hits={stages.courseRetrieval?.hits || []} />
            </div>
          </details>

          {/* Prompt Debug */}
          {response.promptDebug && response.promptDebug.length > 0 && (
            <details>
              <summary className="h5 cursor-pointer py-2 border-bottom d-flex align-items-center justify-content-between">
                <span>Prompt Interceptions ({response.promptDebug.length})</span>
                <Badge variant="info">{response.promptDebug.length} recorded</Badge>
              </summary>
              <div className="py-2">
                <PromptDebugSection entries={response.promptDebug} />
              </div>
            </details>
          )}

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
