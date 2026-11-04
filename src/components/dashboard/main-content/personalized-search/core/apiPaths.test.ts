import { getTurnsUrl } from './transports/ChatTransport';

const BASE = 'http://ea.test';

/** The enterprise-access paths the portal calls (`/api/v1/personalized-search/...`). */
describe('enterprise-access paths', () => {
  it('turns', () => {
    expect(getTurnsUrl(BASE)).toBe('http://ea.test/api/v1/personalized-search/turns/');
  });
});
