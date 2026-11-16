import { BufferedChatTransport } from '../../core/transports/BufferedChatTransport';
import { FixtureChatTransport } from '../../core/transports/FixtureChatTransport';
import { selectTransport } from './selectTransport';
import { SseChatTransport } from '../../core/transports/SseChatTransport';
import { UnavailableChatTransport } from '../../core/transports/UnavailableChatTransport';
import { TransportError } from '../../core/transports/ChatTransport';

describe('selectTransport', () => {
  it.each([
    ['fixture', FixtureChatTransport],
    ['buffered', BufferedChatTransport],
    ['unavailable', UnavailableChatTransport],
    ['sse', SseChatTransport],
    [null, SseChatTransport],
    [undefined, SseChatTransport],
    ['', SseChatTransport],
    ['  ', SseChatTransport],
    ['fixtures', UnavailableChatTransport],
    ['SSE', UnavailableChatTransport],
  ])('PERSONALIZED_SEARCH_TRANSPORT=%p selects %p', (setting, expected) => {
    expect(selectTransport(setting)).toBeInstanceOf(expected);
  });

  it('the placeholder transport rejects like a switched-off backend (404)', async () => {
    const iterator = new UnavailableChatTransport().send()[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toEqual(new TransportError(404, null));
  });
});
