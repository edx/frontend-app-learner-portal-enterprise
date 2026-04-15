import { xpertService } from './xpert.service';
import { xpertContractService } from './xpertContract';
import { LearningPathway, XpertIntent } from '../types';
import { XpertEnrichmentResult } from './xpertDebug';
import { PATHWAY_ENRICHMENT_PROMPT } from '../constants';

/**
 * Service for enriching learning pathways with reasoning using Xpert API.
 */
export const pathwayAssemblerXpertService = {
  /**
   * Enriches a pathway with AI-generated reasoning for each course via Xpert.
   *
   * @param pathway The assembled pathway.
   * @param intent The user's search intent.
   * @returns The enriched pathway with custom reasoning and debug metadata.
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

      // Map reasonings back to courses
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
