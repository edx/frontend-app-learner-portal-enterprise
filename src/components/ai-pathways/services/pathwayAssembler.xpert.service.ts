import { xpertService } from './xpert.service';
import { LearningPathway, SearchIntent } from '../types';

/**
 * Service for enriching learning pathways with reasoning using Xpert API.
 */
export const pathwayAssemblerXpertService = {
  /**
   * Enriches a pathway with AI-generated reasoning for each course via Xpert.
   *
   * @param pathway The assembled pathway.
   * @param intent The user's search intent.
   * @returns The enriched pathway with custom reasoning.
   */
  async enrichWithReasoning(
    pathway: LearningPathway,
    intent: SearchIntent,
  ): Promise<LearningPathway> {
    if (!pathway.courses.length) {
      return pathway;
    }

    const coursesSnippet = pathway.courses.map(c => `- ${c.title}`).join('\n');
    const intentSnippet = `Goal: ${intent.roles.join(', ')}. Required Skills: ${intent.skillsRequired.join(', ')}.`;

    const systemMessageBase = 'You are a career advisor and learning pathway architect. Your objective is to help the user understand why each course retrieved by the discovery service is essential for their chosen career path. For each course provided, write a short, one-sentence reasoning explaining why it is perfect for the user based on their goals and required skills. Be encouraging and specific, highlighting how the course content bridges their current background with their target role.';
    const jsonInstruction = '\n\nYou MUST respond with only a valid JSON object matching the schema. No markdown fences, no explanation, no preamble. Raw JSON only.';

    try {
      const response = await xpertService.sendMessage({
        systemMessage: `${systemMessageBase}${jsonInstruction}`,
        messages: [
          {
            role: 'user',
            content: `User Context: ${intentSnippet}\n\nCourses:\n${coursesSnippet}`,
          },
        ],
        // TODO: confirm correct tag value with Xpert/Discovery team before production
        tags: ['enterprise-course-discovery'],
      });

      const { reasonings } = JSON.parse(response.content);

      // Map reasonings back to courses
      const enrichedCourses = pathway.courses.map(course => {
        const r = reasonings.find((item: any) => item.title.toLowerCase() === course.title.toLowerCase());
        return {
          ...course,
          reasoning: r ? r.reasoning : course.reasoning,
        };
      });

      return { courses: enrichedCourses };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to enrich pathway with Xpert reasoning:', error);
      return pathway;
    }
  },
};
