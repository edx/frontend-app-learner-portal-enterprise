import { getConfig } from '@edx/frontend-platform';
// eslint-disable-next-line import/no-extraneous-dependencies
import axios from 'axios';
import { XpertMessageRequest, XpertMessageResponse } from '../types';

export const xpertService = {
  async sendMessage(request: XpertMessageRequest): Promise<XpertMessageResponse> {
    const clientId = getConfig().XPERT_AI_CLIENT_ID;
    if (!clientId) {
      throw new Error('XPERT_AI_CLIENT_ID is not configured. Ensure it is set in the private environment file.');
    }

    const baseUrl = getConfig().XPERT_API_BASE_URL;
    const url = `${baseUrl}/v1/message`;

    // Tags scope RAG document retrieval.
    // If tags are empty or undefined, the field is omitted from the payload.
    const payload = {
      client_id: clientId,
      messages: request.messages,
      conversation_id: request.conversationId,
      ...(request.systemMessage ? { system_message: request.systemMessage } : {}),
      ...(typeof request.stream === 'boolean' ? { stream: request.stream } : { stream: false }),
      ...(request.tags?.length ? { tags: request.tags } : {}),
    };

    // TODO: confirm auth header requirements with Xpert team —
    //  batch/dropzone endpoints require Authorization but /v1/message docs do not specify
    const response = await axios.post(url, payload);

    return response.data[0];
  },
};
