import axios from 'axios';
import type {
  AiPathwaysService,
  CreateLearnerProfileArgs,
  LearnerProfile,
  LearningPathway,
  CareerOption,
} from './pathways.types';
import { pathwaysStub } from './pathways.stub';
import { pathwaysAdapters } from './pathways.adapters';
import { CAREER_LIST_DATA, COURSES_DATA } from './data';

// In a real app, these should come from configuration or a backend proxy.
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Real implementation of AiPathwaysService using OpenAI API via axios.
 *
 * TODO: Move API keys and direct OpenAI calls to a secure backend proxy
 * before moving this feature out of the prototype phase.
 */
export class OpenAIPathwaysService implements AiPathwaysService {
  private apiKey: string;

  constructor(apiKey: string = '') {
    this.apiKey = apiKey;
  }

  /**
   * Helper to make structured output calls to OpenAI.
   */
  private async callOpenAI(input: string, instructions: string, schema: any, schemaName: string) {
    if (!this.apiKey) {
      console.warn('OpenAI API Key not provided. Falling back to stub.');
      throw new Error('MISSING_API_KEY');
    }

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: input },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: schemaName,
            strict: true,
            schema,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const { content } = response.data.choices[0].message;
    return JSON.parse(content);
  }

  async createLearnerProfile(args: CreateLearnerProfileArgs): Promise<LearnerProfile> {
    try {
      const userInfoSchema = {
        type: 'object',
        properties: {
          targetIndustry: { type: 'string' },
          careerGoal: { type: 'string' },
          overview: { type: 'string' },
        },
        required: ['targetIndustry', 'careerGoal', 'overview'],
        additionalProperties: false,
      };

      const questionToData = {
        'What brings you here today': args.bringsYouHereRes,
        'What career would you like us to help you achieve?': args.careerGoalRes,
        'Whats your current background or role? What relevant skills or experience do you have?': args.backgroundRes,
        'Which industry or field are you most interested in?': args.industryRes,
        'How do you prefer to learn?': args.learningPrefRes,
        'How much time can you dedicate to learning each week?': args.timeAvailableRes,
        'Are you interested in a certificate or credentials?': args.certificateRes,
      };

      const userInfo = await this.callOpenAI(
        `User Question to Response Data: Question: ${JSON.stringify(questionToData)}`,
        'You will be given response data from a user as they\'ve answered a series of questions. Use the data provided to populate the object schema output.',
        userInfoSchema,
        'UserInfo',
      );

      const careerSchema = {
        type: 'object',
        properties: {
          careers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                skills: { type: 'array', items: { type: 'string' } },
                percentMatch: { type: 'number' },
              },
              additionalProperties: false,
              required: ['title', 'skills', 'percentMatch'],
            },
          },
        },
        required: ['careers'],
        additionalProperties: false,
      };

      // Use CAREER_LIST_DATA for matching.
      const careerInfo = await this.callOpenAI(
        `User Career Goal: ${userInfo.careerGoal}`,
        `Find the top 3 careers from the following list that match the goal. In order of higher percent match first: \n\n${JSON.stringify(CAREER_LIST_DATA)}`,
        careerSchema,
        'CareerInfo',
      );

      return pathwaysAdapters.normalizeProfile({
        ...userInfo,
        careerMatches: careerInfo.careers,
        motivation: args.bringsYouHereRes,
        background: args.backgroundRes,
        timeAvailable: args.timeAvailableRes,
        certificate: args.certificateRes,
        learningStyle: args.learningPrefRes,
      });
    } catch (error) {
      console.error('Failed to create learner profile via OpenAI:', error);
      return pathwaysStub.createLearnerProfile(args);
    }
  }

  async createLearningPathway(careerGoal: CareerOption, learnerProfile: LearnerProfile): Promise<LearningPathway> {
    try {
      const learnerInfo = `
        Learner Info:
        The Learners Background Information: ${learnerProfile.background},
        The learner career goal: ${careerGoal.title},
      `;

      const pathwaySchema = {
        type: 'object',
        properties: {
          courses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                level: { type: 'string' },
                skills: { type: 'array', items: { type: 'string' } },
                reasoning: { type: 'string' },
                order: { type: 'number' },
              },
              additionalProperties: false,
              required: ['title', 'level', 'skills', 'reasoning', 'order'],
            },
          },
        },
        required: ['courses'],
        additionalProperties: false,
      };

      const pathwayData = await this.callOpenAI(
        learnerInfo,
        `You are a skills based course recommender. Recommend 3-5 courses in progressive order from this list: \n\n${JSON.stringify(COURSES_DATA)}`,
        pathwaySchema,
        'PathwayInfo',
      );

      return pathwaysAdapters.normalizePathway(pathwayData);
    } catch (error) {
      console.error('Failed to create learning pathway via OpenAI:', error);
      return pathwaysStub.createLearningPathway(careerGoal, learnerProfile);
    }
  }
}

/**
 * Singleton service instance.
 * Defaults to stub if no API key is provided in environment.
 */
export const pathwaysService: AiPathwaysService = new OpenAIPathwaysService(
  process.env.OPENAI_API_KEY || '',
);
