import { intentExtractionXpertService } from '../intentExtraction.xpert.service';
import { xpertService } from '../xpert.service';
import { xpertContractService } from '../xpertContract';
import { mockSearchIntent } from '../../fixtures';

jest.mock('../xpert.service');
jest.mock('../xpertContract');

describe('intentExtractionXpertService', () => {
  const mockInput = {
    freeText: 'software engineering', preferences: [], selectedGoals: [], knownContext: [],
  };
  const mockFacets = {
    name: [{ value: 'Dev', count: 1 }],
    skills: [{ value: 'JS', count: 1 }],
    industries: [{ value: 'Tech', count: 1 }],
    jobSources: [{ value: 'Site', count: 1 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractIntent', () => {
    it('extracts intent successfully on first try', async () => {
      (xpertService.sendMessage as jest.Mock).mockResolvedValue({ content: '{"condensedQuery": "test"}' });
      (xpertContractService.parseIntent as jest.Mock).mockReturnValue(mockSearchIntent);
      (xpertContractService.validateIntent as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (xpertContractService.normalizeIntent as jest.Mock).mockReturnValue(mockSearchIntent);

      const result = await intentExtractionXpertService.extractIntent(mockInput, mockFacets);

      expect(result.intent).toEqual(mockSearchIntent);
      expect(result.debug.success).toBe(true);
      expect(result.debug.repairPromptUsed).toBe(false);
      expect(result.debug.wasDiscoveryUsed).toBe(false);
    });

    it('captures discovery data from response', async () => {
      const mockDiscovery = { used: true, details: 'rag used' };
      (xpertService.sendMessage as jest.Mock).mockResolvedValue({
        content: '{"condensedQuery": "test"}',
        discovery: mockDiscovery,
      });
      (xpertContractService.parseIntent as jest.Mock).mockReturnValue(mockSearchIntent);
      (xpertContractService.validateIntent as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (xpertContractService.normalizeIntent as jest.Mock).mockReturnValue(mockSearchIntent);

      const result = await intentExtractionXpertService.extractIntent(mockInput);

      expect(result.debug.discovery).toEqual(mockDiscovery);
    });

    it('uses repair logic if first response is invalid', async () => {
      (xpertService.sendMessage as jest.Mock)
        .mockResolvedValueOnce({ content: 'invalid' })
        .mockResolvedValueOnce({ content: '{"condensedQuery": "fixed"}' });

      (xpertContractService.parseIntent as jest.Mock)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockSearchIntent);

      (xpertContractService.validateIntent as jest.Mock)
        .mockReturnValueOnce({ isValid: false, errors: ['Error 1'] })
        .mockReturnValueOnce({ isValid: true, errors: [] });

      (xpertContractService.normalizeIntent as jest.Mock).mockReturnValue(mockSearchIntent);

      const result = await intentExtractionXpertService.extractIntent(mockInput);

      expect(result.debug.repairPromptUsed).toBe(true);
      expect(result.debug.success).toBe(true);
      expect(xpertService.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('handles prompt interception - accepted', async () => {
      const editedBundle = { combined: 'edited prompt', parts: [] };
      const interceptPrompt = jest.fn().mockResolvedValue({ decision: 'accepted', bundle: editedBundle });

      (xpertService.sendMessage as jest.Mock).mockResolvedValue({ content: '{}' });
      (xpertContractService.parseIntent as jest.Mock).mockReturnValue(mockSearchIntent);
      (xpertContractService.validateIntent as jest.Mock).mockReturnValue({ isValid: true, errors: [] });

      await intentExtractionXpertService.extractIntent(mockInput, null, interceptPrompt);

      expect(interceptPrompt).toHaveBeenCalled();
      expect(xpertService.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        systemMessage: 'edited prompt',
      }));
    });

    it('handles prompt interception - rejected', async () => {
      const interceptPrompt = jest.fn().mockResolvedValue({ decision: 'rejected' });

      (xpertService.sendMessage as jest.Mock).mockResolvedValue({ content: '{}' });
      (xpertContractService.parseIntent as jest.Mock).mockReturnValue(mockSearchIntent);
      (xpertContractService.validateIntent as jest.Mock).mockReturnValue({ isValid: true, errors: [] });

      await intentExtractionXpertService.extractIntent(mockInput, null, interceptPrompt);

      // Should use original bundle
      expect(xpertService.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        systemMessage: expect.stringContaining('You are a grounded career-skill extraction engine'),
      }));
    });

    it('handles prompt interception - cancelled', async () => {
      const interceptPrompt = jest.fn().mockResolvedValue({ decision: 'cancelled' });

      await expect(intentExtractionXpertService.extractIntent(mockInput, null, interceptPrompt))
        .rejects.toThrow('PromptInterceptor: intent extraction cancelled by user');
    });

    it('handles Xpert service error', async () => {
      (xpertService.sendMessage as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await intentExtractionXpertService.extractIntent(mockInput);

      expect(result.debug.success).toBe(false);
      expect(result.debug.validationErrors[0]).toContain('Network error');
    });
  });

  describe('generateSampleCareers', () => {
    it('returns parsed careers on success', async () => {
      const careers = [{ title: 'Career 1' }];
      (xpertService.sendMessage as jest.Mock).mockResolvedValue({ content: JSON.stringify(careers) });

      const result = await intentExtractionXpertService.generateSampleCareers(mockInput);
      expect(result).toEqual(careers);
    });

    it('returns empty array on JSON parse error', async () => {
      (xpertService.sendMessage as jest.Mock).mockResolvedValue({ content: 'invalid' });
      const result = await intentExtractionXpertService.generateSampleCareers(mockInput);
      expect(result).toEqual([]);
    });

    it('returns empty array on Xpert error', async () => {
      (xpertService.sendMessage as jest.Mock).mockRejectedValue(new Error());
      const result = await intentExtractionXpertService.generateSampleCareers(mockInput);
      expect(result).toEqual([]);
    });
  });

  describe('buildSystemPrompt', () => {
    it('includes facet context when facets are provided', () => {
      const bundle = intentExtractionXpertService.buildSystemPrompt(mockFacets);
      expect(bundle.parts).toHaveLength(2);
      expect(bundle.combined).toContain('Use the following available facet values');
      expect(bundle.combined).toContain('Dev');
      expect(bundle.combined).toContain('JS');
    });

    it('omits facet context when facets are null', () => {
      const bundle = intentExtractionXpertService.buildSystemPrompt(null);
      expect(bundle.parts).toHaveLength(1);
      expect(bundle.combined).not.toContain('Use the following available facet values');
    });
  });
});
