import { xpertService } from '../xpert.service';
import { intentExtractionXpertService } from '../intentExtraction.xpert.service';

jest.mock('../xpert.service', () => ({
  xpertService: {
    sendMessage: jest.fn(),
  },
}));

describe('intentExtractionXpertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSampleCareers', () => {
    const mockInput = {
      freeText: 'learn python for data science',
      selectedGoals: ['Data Scientist'],
      knownContext: ['None'],
      preferences: ['medium', 'practical'],
    };

    it('returns an array of career options on success', async () => {
      const mockCareers = [
        { title: 'Data Scientist', percentMatch: 95, skills: ['Python', 'SQL'], industries: ['Tech'] },
        { title: 'Data Analyst', percentMatch: 85, skills: ['Python', 'Excel'], industries: ['Finance'] },
      ];

      (xpertService.sendMessage as jest.Mock).mockResolvedValue({
        content: JSON.stringify(mockCareers),
      });

      const result = await intentExtractionXpertService.generateSampleCareers(mockInput);

      expect(xpertService.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        systemMessage: expect.stringContaining('career advisor'),
        messages: [
          {
            role: 'user',
            content: JSON.stringify(mockInput),
          },
        ],
      }));
      expect(result).toEqual(mockCareers);
    });

    it('returns an empty array if parsing fails', async () => {
      (xpertService.sendMessage as jest.Mock).mockResolvedValue({
        content: 'invalid json',
      });

      const result = await intentExtractionXpertService.generateSampleCareers(mockInput);

      expect(result).toEqual([]);
    });

    it('returns an empty array if xpertService fails', async () => {
      (xpertService.sendMessage as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await intentExtractionXpertService.generateSampleCareers(mockInput);

      expect(result).toEqual([]);
    });
  });
});
