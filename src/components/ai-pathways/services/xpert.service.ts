import axios from 'axios';
import { getConfig } from '@edx/frontend-platform';

export interface XpertMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface XpertMessageRequest {
  messages: XpertMessage[];
  systemMessage: string;
  tags?: string[];
  conversationId?: string;
}

export interface XpertMessageResponse {
  content: string;
  role: string;
}

export const xpertService = {
  async sendMessage(request: XpertMessageRequest): Promise<XpertMessageResponse> {
    const clientId = getConfig().XPERT_AI_CLIENT_ID;
    if (!clientId) {
      throw new Error('XPERT_AI_CLIENT_ID is not configured. Ensure it is set in the private environment file.');
    }

    const baseUrl = getConfig().XPERT_API_URL || 'https://xpert-api-services.stg.ai.2u.com';
    const url = `${baseUrl}/v1/message`;

    const body = {
      client_id: clientId,
      messages: request.messages,
      system_message: request.systemMessage,
      conversation_id: request.conversationId,
      stream: false,
    };

    // TODO: confirm auth header requirements with Xpert team —
    //  batch/dropzone endpoints require Authorization but /v1/message docs do not specify
    const response = await axios.post(url, body);

    return response.data[0];
  },
};
