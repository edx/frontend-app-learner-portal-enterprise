import { xpertService } from './xpert.service';
import { xpertContractService } from './xpertContract';
import { LearningPathway, XpertIntent } from '../types';
import { XpertEnrichmentResult } from './xpertDebug';
import { PATHWAY_ENRICHMENT_PROMPT } from '../constants';

/**
 * AI service for enriching a learning pathway with personalized reasoning.
 *
 * Pipeline context: This is the final stage of the generation process. It takes
 * the retrieved courses and the learner's intent, and uses Xpert to generate
 * encouraging, goal-oriented explanations for why each course was selected.
 */
export const pathwayAssemblerXpertService = {
  /**
   * Enriches the provided pathway with AI-generated reasoning for each course.
   *
   * @param pathway The assembled pathway containing retrieved courses.
   * @param intent The user's search intent (used for personalization context).
   * @returns A promise resolving to an enriched pathway and execution metrics.
   */
  async enrichWithReasoning(
    pathway: LearningPathway,
    intent: XpertIntent,
  ): Promise<XpertEnrichmentResult> {
    const startTime = Date.now();
    if (!pathway.courses.length) {
      return {
        pathway,
        debug: {
          systemPrompt: '',
          rawResponse: '',
          durationMs: 0,
          success: true,
        },
      };
    }

    /**
     * Prepare compact snippets of the course list and learner intent to reduce token usage.
     */
    const coursesSnippet = pathway.courses.map(c => `- ID: ${c.id}, Title: ${c.title}`).join('\n');
    const intentSnippet = `Goal: ${intent.roles.join(', ')}. Required Skills: ${intent.skillsRequired.join(', ')}.`;

    const systemPrompt = `${PATHWAY_ENRICHMENT_PROMPT.SYSTEM_MESSAGE_BASE}${PATHWAY_ENRICHMENT_PROMPT.JSON_INSTRUCTION}`;

    try {
      const response = await xpertService.sendMessage({
        systemMessage: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `User Context: ${intentSnippet}\n\nCourses:\n${coursesSnippet}`,
          },
        ],
        tags: ['enterprise-course-discovery'],
      });

      const parsed = xpertContractService.parseReasoning(response.content);
      if (!parsed) {
        return {
          pathway,
          debug: {
            systemPrompt,
            rawResponse: response.content,
            durationMs: Date.now() - startTime,
            success: false,
          },
        };
      }

      /**
       * Map the generated reasonings back to their respective courses based on the ID.
       */
      const enrichedCourses = pathway.courses.map(course => {
        const r = parsed.reasonings.find(item => item.id === course.id);
        return {
          ...course,
          reasoning: r ? r.reasoning : course.reasoning,
        };
      });

      return {
        pathway: { courses: enrichedCourses },
        debug: {
          systemPrompt,
          rawResponse: response.content,
          durationMs: Date.now() - startTime,
          success: true,
        },
      };
    } catch (error) {
      return {
        pathway,
        debug: {
          systemPrompt,
          rawResponse: '',
          durationMs: Date.now() - startTime,
          success: false,
        },
      };
    }
  },
};
