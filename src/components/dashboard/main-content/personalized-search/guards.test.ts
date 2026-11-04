import fs from 'fs';
import path from 'path';

/**
 * KD-10 module boundaries. `core/` is framework-free TypeScript; `ui/` and `blocks/` are
 * presentational; `adapters/` is the only place that knows the host app; `feature/` composes them
 * without importing a host. Tests and test helpers are exempt: they wire mocks.
 */
const root = __dirname;

const sourceFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) { return []; }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { return entry.name === '__fixtures__' ? [] : sourceFiles(full); }
    return /\.(t|j)sx?$/.test(entry.name) ? [full] : [];
  });
};
const isTestFile = (file: string) => /\.test\.|testUtils\./.test(file);
const importsOf = (file: string): string[] => Array.from(
  fs.readFileSync(file, 'utf8').matchAll(/(?:^import[^'"]*|^export[^'"]*from\s*|jest\.mock\()['"]([^'"]+)['"]/gm),
).map(([, spec]) => spec);
const resolved = (file: string, spec: string) => (spec.startsWith('.') ? path.resolve(path.dirname(file), spec) : spec);
const within = (target: string, dir: string) => (
  target === path.join(root, dir) || target.startsWith(path.join(root, dir) + path.sep)
);
const outsideFeature = (target: string) => path.isAbsolute(target) && !within(target, '.');

type Rule = (spec: string, target: string) => boolean;
const offenders = (dir: string, isForbidden: Rule) => sourceFiles(path.join(root, dir))
  .filter((file) => !isTestFile(file))
  .flatMap((file) => importsOf(file)
    .filter((spec) => isForbidden(spec, resolved(file, spec)))
    .map((spec) => `${path.relative(root, file)} -> ${spec}`));

describe('personalized-search module boundaries (KD-10)', () => {
  it('imports nothing from learner-pathways/', () => {
    const files = sourceFiles(root).filter((file) => /from ['"][^'"]*learner-pathways/.test(fs.readFileSync(file, 'utf8')));
    expect(files).toEqual([]);
  });

  it('core/ imports no React, no edX or Paragon package, no state library and no other layer', () => {
    expect(offenders('core', (spec, target) => (
      /^(react|react-dom|react-router|react-router-dom|zustand)(\/|$)/.test(spec)
      || /^@(edx|openedx)\//.test(spec)
      || (path.isAbsolute(target) && !within(target, 'core'))
    ))).toEqual([]);
  });

  it('ui/ and blocks/ import nothing from adapters/, feature/ or the host app', () => {
    const forbidden = (_spec: string, target: string) => outsideFeature(target)
      || within(target, 'adapters') || within(target, 'feature');
    expect([...offenders('ui', forbidden), ...offenders('blocks', forbidden)]).toEqual([]);
  });

  it('feature/ imports no adapter and nothing from the host app', () => {
    expect(offenders('feature', (_spec, target) => outsideFeature(target) || within(target, 'adapters'))).toEqual([]);
  });
});
