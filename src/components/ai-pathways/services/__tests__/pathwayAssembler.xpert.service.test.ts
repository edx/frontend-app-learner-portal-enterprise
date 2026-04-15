import { pathwayAssemblerXpertService } from '../pathwayAssembler.xpert.service';
import { xpertService } from '../xpert.service';
import { xpertContractService } from '../xpertContract';
import { LearningPathway, XpertIntent } from '../../types';

jest.mock('../xpert.service');
jest.mock('../xpertContract');

describe('pathwayAssemblerXpertService', () => {
  const mockPathway: LearningPathway = {
    id: 'p1',
    title: 'Pathway 1',
    courses: [
      { id: 'c1', title: 'Course 1', status: 'not started', level: 'Beginner', reasoning: '', order: 1, skills: [] },
    ],
  };

  const mockIntent: XpertIntent = {
    roles: ['Software Engineer'],
    skillsRequired: ['React'],
    skillsPreferred: [],
    industries: [],
    jobSources: [],
    condensedQuery: 'react',
    learnerLevel: 'beginner',
    timeCommitment: 'medium',
    excludeTags: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enrichWithReasoning', () => {
    it('returns early if no courses', async () => {
      const result = await pathwayAssemblerXpertService.enrichWithReasoning({ ...mockPathway, courses: [] }, mockIntent);
      expect(result.debug.success).toBe(true);
      expect(result.debug.durationMs).toBe(0);
    });

    it('enriches pathway successfully', async () => {
      (xpertService.sendMessage as jest.Mock).mockResolvedValue({ content: '{"reasonings": [{"id": "c1", "reasoning": "New reasoning"}]}' });
      (xpertContractService.parseReasoning as jest.Mock).mockReturnValue({
        reasonings: [{ id: 'c1', reasoning: 'New reasoning' }]
      });

      const result = await pathwayAssemblerXpertService.enrichWithReasoning(mockPathway, mockIntent);

      expect(result.debug.success).toBe(true);
      expect(result.pathway.courses[0].reasoning).toBe('New reasoning');
    });

    it('handles parse error', async () => {
      (xpertService.sendMessage as jest.Mock).mockResolvedValue({ content: 'invalid' });
      (xpertContractService.parseReasoning as jest.Mock).mockReturnValue(null);

      const result = await pathwayAssemblerXpertService.enrichWithReasoning(mockPathway, mockIntent);

      expect(result.debug.success).toBe(false);
      expect(result.pathway).toEqual(mockPathway);
    });

    it('handles service error', async () => {
      (xpertService.sendMessage as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await pathwayAssemblerXpertService.enrichWithReasoning(mockPathway, mockIntent);

      expect(result.debug.success).toBe(false);
      expect(result.pathway).toEqual(mockPathway);
    });
  });
});
