import fs from 'fs';
import path from 'path';

// LEARNER_SUPPORT_URL is sourced from process.env at runtime (see src/index.tsx),
// which every consumer test already mocks to an arbitrary placeholder — so this is
// the one place that pins the actual configured value for the canonical
// LEARNER_SUPPORT_URL destination across the tracked env files.
const ENV_FILES = ['.env.development', '.env.development-stage'];
const EXPECTED_LEARNER_SUPPORT_URL = 'https://enterprise-support.edx.org/s/';

describe('LEARNER_SUPPORT_URL', () => {
  it.each(ENV_FILES)('is set to the canonical enterprise support destination in %s', (envFile) => {
    const envFileContents = fs.readFileSync(path.resolve(process.cwd(), envFile), 'utf-8');
    expect(envFileContents).toMatch(`LEARNER_SUPPORT_URL='${EXPECTED_LEARNER_SUPPORT_URL}'`);
  });
});
