import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { DebugConsole } from '../DebugConsole';
import { AIPathwaysResponseModel } from '../../types';
import { exportResponseModel } from '../../utils/exportResponseModel';

jest.mock('../../utils/exportResponseModel');
jest.mock('../../../search/SearchCourseCard', () => () => <div data-testid="course-card">Course Card</div>);

describe('DebugConsole', () => {
  const mockResponse: AIPathwaysResponseModel = {
    requestId: 'test-req-id',
    stages: {
      facetBootstrap: { durationMs: 100, success: true },
      intentExtraction: {
        durationMs: 200,
        success: true,
        systemPrompt: 'intent system prompt',
        rawResponse: 'intent raw response',
        parsedResponse: { condensedQuery: 'test' },
        validationErrors: ['err1'],
        repairPromptUsed: true,
      },
      careerRetrieval: { durationMs: 150, success: true, resultCount: 2 },
      catalogFacetSnapshot: {
        durationMs: 50,
        success: true,
        trace: {
          skillNamesCount: 10,
          sampleSkillNames: ['Skill1'],
          skillsDotNameCount: 5,
          subjectsCount: 3,
          sampleSubjects: ['Subj1'],
          levelTypeCount: 2,
          partnersNameCount: 4,
        },
      },
      rulesFirstMapping: {
        durationMs: 30,
        success: true,
        trace: {
          termsConsidered: 5,
          exactMatchCount: 1,
          exactMatches: ['Exact'],
          aliasMatchCount: 1,
          aliasMatches: ['Alias'],
          unmatchedCount: 1,
          unmatched: ['Unmatched'],
        },
      },
      catalogTranslation: {
        durationMs: 40,
        success: true,
        trace: {
          query: 'test query',
          queryAlternates: ['alt'],
          strictSkillCount: 1,
          strictSkills: ['Strict'],
          boostSkillCount: 1,
          boostSkills: ['Boost'],
          subjectHintCount: 1,
          subjectHints: ['Hint'],
          droppedSkillCount: 0,
          xpertUsed: true,
          xpertDurationMs: 100,
          xpertSuccess: true,
          xpertSystemPrompt: 'xpert translation system prompt',
          xpertRawResponse: 'xpert translation raw response',
        },
      },
      retrievalLadder: {
        durationMs: 0,
        success: true,
        trace: {
          winnerStep: 1,
          attempts: [
            {
              step: 1,
              label: 'Step 1',
              hitCount: 1,
              winner: true,
              query: 'step 1 query',
              hits: [{ objectID: 'c1', title: 'Course 1' } as any],
            },
          ],
        },
      },
      courseRetrieval: {
        durationMs: 100,
        success: true,
        resultCount: 1,
        hits: [{ objectID: 'c1', title: 'Course 1' } as any],
      },
      pathwayEnrichment: {
        durationMs: 300,
        success: true,
        systemPrompt: 'enrichment system prompt',
        rawResponse: 'enrichment raw response',
      },
    },
    promptDebug: [
      {
        label: 'Prompt 1',
        decision: 'accepted',
        timestamp: '2023-01-01',
        original: { stage: 'intentExtraction', combined: 'orig1', parts: [] },
        edited: { stage: 'intentExtraction', combined: 'edit1', parts: [] },
        validationWarnings: [{ code: 'W1', severity: 'warning', message: 'msg1' }],
      },
      {
        label: 'Prompt 2',
        decision: 'rejected',
        timestamp: '2023-01-02',
        original: { stage: 'intentExtraction', combined: 'orig2', parts: [] },
      },
      {
        label: 'Prompt 3',
        decision: 'cancelled',
        timestamp: '2023-01-03',
        original: { stage: 'intentExtraction', combined: 'orig3', parts: [] },
      },
    ],
  };

  it('renders nothing if response is null', () => {
    const { container } = render(<DebugConsole response={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders all sections and handles export', () => {
    render(
      <IntlProvider locale="en">
        <DebugConsole response={mockResponse} />
      </IntlProvider>
    );

    expect(screen.getByText(/AI Pathways Debug Console/i)).toBeInTheDocument();
    expect(screen.getByText(/Request ID: test-req-id/i)).toBeInTheDocument();

    // Check various stages
    expect(screen.getByText(/Stage 1: Facet Bootstrap/i)).toBeInTheDocument();
    expect(screen.getByText(/Stage 2: Xpert Intent Extraction/i)).toBeInTheDocument();
    expect(screen.getByText(/Stage 3: Career Retrieval/i)).toBeInTheDocument();
    expect(screen.getByText(/Stage 3b: Catalog Facet Snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Stage 4: Course Retrieval/i)).toBeInTheDocument();

    // Check content inside stages (might need to open them if they are in <details>)
    expect(screen.getByText(/intent system prompt/i)).toBeInTheDocument();
    expect(screen.getByText(/enrichment system prompt/i)).toBeInTheDocument();

    // Check prompt debug section
    expect(screen.getByText(/Prompt Interceptions \(3\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Prompt 1/i)).toBeInTheDocument();
    expect(screen.getByText(/accepted/i)).toBeInTheDocument();
    expect(screen.getByText(/rejected/i)).toBeInTheDocument();
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
    expect(screen.getByText(/\[W1\] msg1/i)).toBeInTheDocument();

    // Check export button
    const exportBtn = screen.getByRole('button', { name: /export json/i });
    fireEvent.click(exportBtn);
    expect(exportResponseModel).toHaveBeenCalledWith(mockResponse);
  });

  it('renders CourseRetrievalSection with no hits', () => {
    const responseWithNoHits = {
      ...mockResponse,
      stages: {
        ...mockResponse.stages,
        courseRetrieval: { durationMs: 0, success: true, resultCount: 0, hits: [] },
      },
    };
    render(
      <IntlProvider locale="en">
        <DebugConsole response={responseWithNoHits} />
      </IntlProvider>
    );
    expect(screen.getByText(/No courses returned for the winning step./i)).toBeInTheDocument();
  });
});
