import { catalogTranslationXpertService } from '../catalogTranslation.xpert.service';
import { xpertService } from '../xpert.service';
import { xpertCatalogTranslationPrompt } from '../xpertCatalogTranslationPrompt';

jest.mock('../xpert.service');
jest.mock('../xpertCatalogTranslationPrompt');

describe('catalogTranslationXpertService coverage gaps', () => {
  const mockPayload = { careerTitle: 'Dev', unmatchedTerms: [], facetSnapshot: {} } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (xpertCatalogTranslationPrompt.buildTranslationPrompt as jest.Mock).mockReturnValue({
      bundle: { combined: 'test', parts: [] },
      userPayload: {}
    });
  });

  it('handles cancellation during interception', async () => {
    const interceptPrompt = jest.fn().mockResolvedValue({ decision: 'cancelled' });

    await expect(catalogTranslationXpertService.translateUnmatched(mockPayload, interceptPrompt))
      .rejects.toThrow('PromptInterceptor: catalog translation cancelled by user');
  });

  it('handles Xpert service failure', async () => {
    (xpertService.sendMessage as jest.Mock).mockRejectedValue(new Error('fail'));

    const result = await catalogTranslationXpertService.translateUnmatched(mockPayload);
    expect(result.debug.success).toBe(false);
    expect(result.rawResponse).toBe('');
  });

  it('handles rejected interception', async () => {
    const interceptPrompt = jest.fn().mockResolvedValue({ decision: 'rejected' });
    (xpertService.sendMessage as jest.Mock).mockResolvedValue({ content: 'ok' });

    const result = await catalogTranslationXpertService.translateUnmatched(mockPayload, interceptPrompt);
    expect(result.rawResponse).toBe('ok');
    expect(result.debug.success).toBe(true);
  });
});
