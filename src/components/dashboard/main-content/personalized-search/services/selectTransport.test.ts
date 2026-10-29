import fs from 'fs';
import path from 'path';

import { BufferedChatTransport } from './BufferedChatTransport';
import { FixtureChatTransport } from './FixtureChatTransport';
import { selectTransport } from './selectTransport';
import { UnavailableChatTransport } from './UnavailableChatTransport';
import { TransportError } from './ChatTransport';

describe('selectTransport', () => {
  it.each([
    ['fixture', FixtureChatTransport],
    ['buffered', BufferedChatTransport],
    [null, UnavailableChatTransport],
    [undefined, UnavailableChatTransport],
    ['', UnavailableChatTransport],
  ])('PERSONALIZED_SEARCH_TRANSPORT=%p selects %p', (setting, expected) => {
    expect(selectTransport(setting)).toBeInstanceOf(expected);
  });

  it('the placeholder transport rejects like a switched-off backend (404)', async () => {
    const iterator = new UnavailableChatTransport().send()[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toEqual(new TransportError(404, null));
  });
});

describe('personalized-search isolation', () => {
  const root = path.resolve(__dirname, '..');
  const sourceFiles = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { return sourceFiles(full); }
    return /\.(t|j)sx?$/.test(entry.name) ? [full] : [];
  });

  it('imports nothing from learner-pathways/', () => {
    const offenders = sourceFiles(root).filter((file) => /from ['"][^'"]*learner-pathways/.test(fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
