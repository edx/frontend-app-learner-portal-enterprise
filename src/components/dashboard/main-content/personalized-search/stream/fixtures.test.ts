import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { goldenFixtures } from './__fixtures__';
import { fixturesDir, GOLDEN_FILES, readGolden } from './testUtils';

const readmeHashes = (): Record<string, string> => {
  const readme = fs.readFileSync(path.join(fixturesDir, 'README.md'), 'utf8');
  const rows = Array.from(readme.matchAll(/^\| `([^`]+\.sse)` \| `([0-9a-f]{64})` \|$/gm));
  return Object.fromEntries(rows.map(([, file, hash]) => [file, hash]));
};

describe('golden fixture copies', () => {
  it.each(GOLDEN_FILES)('%s matches the sha256 recorded in README.md', (file) => {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(fixturesDir, file))).digest('hex');
    expect(readmeHashes()[file]).toBe(hash);
  });

  it.each(GOLDEN_FILES)('the %s export in __fixtures__/index.ts equals the file', (file) => {
    expect(goldenFixtures[file]).toBe(readGolden(file));
  });
});
