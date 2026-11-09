const { createConfig } = require('@openedx/frontend-build');

process.env.TZ = 'UTC';

const config = createConfig('jest', {
  setupFiles: [
    '<rootDir>/src/setupTest.js',
  ],
});

// We exclusively use ES-style imports across the org, but those aren't
// compatible with Jest, so force Jest to transpile any of the
// dependencies we authored (plus lodash-es).
config.transformIgnorePatterns = ['node_modules/(?!(lodash-es|@(open)?edx|@2uinc)/)'];

// The fixture-sync script is a developer CLI (it rewrites the .sse fixture index), not shipped code.
config.coveragePathIgnorePatterns = [...(config.coveragePathIgnorePatterns || []), 'personalized-search/core/stream/__fixtures__/syncFixtures.js'];

module.exports = config;
