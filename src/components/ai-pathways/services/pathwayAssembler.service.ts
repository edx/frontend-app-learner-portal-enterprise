import axios from 'axios';
import { PathwayCourse, LearningPathway, CourseStatus, SearchIntent } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Service for assembling candidate courses into a cohesive learning journey.
 * Handles sequencing, status assignment, and reasoning generation.
 */
export const pathwayAssemblerService = {
  /**
   * Assembles a LearningPathway from a candidate list of courses.
   *
   * @param candidates Normalized course hits from retrieval + adapters.
   * @returns A learning pathway with sequencing and status assigned.
   */
  assemblePathway(candidates: PathwayCourse[]): LearningPathway {
    // 1. Sort by the 'order' field (determined by search relevance or explicit sequencing)
    const sorted = [...candidates].sort((a, b) => a.order - b.order);

    // 2. Assign lifecycle status based on sequence (Prototype logic: 1st completed, 2nd in-progress, others not-started)
    const courses: PathwayCourse[] = sorted.map((course, index) => {
      let status: CourseStatus = 'not started';
      if (index === 0) {
        status = 'completed';
      } else if (index === 1) {
        status = 'in progress';
      }

      return {
        ...course,
        status,
        // Ensure reasoning is present
        reasoning: course.reasoning || 'This course builds the foundational skills needed for your target role.',
      };
    });

    return { courses };
  },

  /**
   * Optional step to enrich a pathway with AI-generated reasoning for each course.
   *
   * @param pathway The assembled pathway.
   * @param intent The user's search intent.
   * @param apiKey OpenAI API key.
   * @returns The enriched pathway with custom reasoning.
   */
  async enrichWithReasoning(
    pathway: LearningPathway,
    intent: SearchIntent,
    apiKey: string,
  ): Promise<LearningPathway> {
    if (!apiKey || !pathway.courses.length) {
      return pathway;
    }

    const coursesSnippet = pathway.courses.map(c => `- ${c.title}`).join('\n');
    const intentSnippet = `Goal: ${intent.roles.join(', ')}. Required Skills: ${intent.skillsRequired.join(', ')}.`;

    const schema = {
      type: 'object',
      properties: {
        reasonings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              reasoning: { type: 'string' },
            },
            required: ['title', 'reasoning'],
            additionalProperties: false,
          },
        },
      },
      required: ['reasonings'],
      additionalProperties: false,
    };

    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: DEFAULT_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a career advisor. For each course provided, write a short, one-sentence reasoning explaining why it is perfect for the user based on their goals and required skills. Be encouraging and specific.',
            },
            {
              role: 'user',
              content: `User Context: ${intentSnippet}\n\nCourses:\n${coursesSnippet}`,
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'PathwayReasoning',
              strict: true,
              schema,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const { content } = response.data.choices[0].message;
      const { reasonings } = JSON.parse(content);

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
      console.error('Failed to enrich pathway with AI reasoning:', error);
      return pathway;
    }
  },
};
