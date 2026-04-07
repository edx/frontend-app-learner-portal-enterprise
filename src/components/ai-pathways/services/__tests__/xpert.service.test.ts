import axios from 'axios';
import { getConfig } from '@edx/frontend-platform';
import { xpertService } from '../xpert.service';

jest.mock('axios');
jest.mock('@edx/frontend-platform', () => ({
  getConfig: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetConfig = getConfig as jest.Mock;

describe('xpertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the correct request and returns the response content on happy path', async () => {
    mockedGetConfig.mockReturnValue({
      XPERT_AI_CLIENT_ID: 'test-client-id',
      XPERT_API_URL: 'https://test-api.com',
    });

    const mockResponse = {
      data: [
        {
          role: 'assistant',
          content: '{"condensedQuery": "software engineering"}',
        },
      ],
    };
    mockedAxios.post.mockResolvedValue(mockResponse);

    const request = {
      messages: [{ role: 'user', content: 'hello' } as const],
      systemMessage: 'system prompt',
      tags: ['tag1'],
      conversationId: 'conv123',
    };

    const result = await xpertService.sendMessage(request);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://test-api.com/v1/message',
      {
        client_id: 'test-client-id',
        messages: [{ role: 'user', content: 'hello' }],
        system_message: 'system prompt',
        tags: ['tag1'],
        conversation_id: 'conv123',
        stream: false,
      },
    );
    expect(result).toEqual(mockResponse.data[0]);
  });

  it('throws a descriptive error when XPERT_AI_CLIENT_ID is missing', async () => {
    mockedGetConfig.mockReturnValue({});

    await expect(xpertService.sendMessage({
      messages: [],
      systemMessage: '',
    })).rejects.toThrow(
      'XPERT_AI_CLIENT_ID is not configured. Ensure it is set in the private environment file.',
    );
  });

  it('propagates network errors', async () => {
    mockedGetConfig.mockReturnValue({
      XPERT_AI_CLIENT_ID: 'test-client-id',
    });

    const error = new Error('Network Error');
    mockedAxios.post.mockRejectedValue(error);

    await expect(xpertService.sendMessage({
      messages: [],
      systemMessage: '',
    })).rejects.toThrow('Network Error');
  });
});
