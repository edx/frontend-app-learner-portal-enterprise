import { getItemFeedbackUrl } from './api/feedback';
import { getSessionsUrl } from './api/sessions';
import { getTurnsUrl } from './transports/ChatTransport';

const BASE = 'http://ea.test';

/** The enterprise-access paths the portal calls (`/api/v1/personalized-search/...`). */
describe('enterprise-access paths', () => {
  it('turns', () => {
    expect(getTurnsUrl(BASE)).toBe('http://ea.test/api/v1/personalized-search/turns/');
  });

  it('sessions and one session', () => {
    expect(getSessionsUrl(BASE)).toBe('http://ea.test/api/v1/personalized-search/sessions/');
  });

  it('item feedback', () => {
    expect(getItemFeedbackUrl(BASE)).toBe('http://ea.test/api/v1/personalized-search/item-feedback/');
  });
});
