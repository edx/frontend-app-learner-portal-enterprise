import { xpertService } from './xpert.service';
import { xpertContractService } from './xpertContract';
import { LearningPathway, XpertIntent } from '../types';
import { XpertEnrichmentResult } from './xpertDebug';

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

    const systemMessageBase = 'You are a career advisor and learning pathway architect. Your objective is to help the user understand why each course retrieved by the discovery service is essential for their chosen career path. For each course provided, write a short, one-sentence reasoning explaining why it is perfect for the user based on their goals and required skills. Be encouraging and specific, highlighting how the course content bridges their current background with their target role.';
    const jsonInstruction = '\n\nYou MUST respond with only a valid JSON object matching the schema. Each reasoning item must include the "id" of the course it refers to. Raw JSON only.';
    const systemPrompt = `${systemMessageBase}${jsonInstruction}`;

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
      // eslint-disable-next-line no-console
      console.error('Failed to enrich pathway with Xpert reasoning:', error);
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
