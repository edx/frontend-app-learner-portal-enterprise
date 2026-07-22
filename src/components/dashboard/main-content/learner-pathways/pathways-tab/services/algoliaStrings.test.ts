import { isMalformedCompound, normalizeString } from './algoliaStrings';

describe('normalizeString', () => {
  it('trims whitespace', () => {
    expect(normalizeString('  SQL  ')).toBe('SQL');
  });

  it('collapses null/undefined to an empty string', () => {
    expect(normalizeString(null)).toBe('');
    expect(normalizeString(undefined)).toBe('');
  });

  it('collapses a blank/whitespace-only string to an empty string', () => {
    expect(normalizeString('   ')).toBe('');
  });
});

describe('isMalformedCompound', () => {
  it('flags names joined with " & "', () => {
    expect(isMalformedCompound('SQL & Python')).toBe(true);
  });

  it('flags names joined with " + "', () => {
    expect(isMalformedCompound('Excel + Tableau')).toBe(true);
  });

  it('does not flag a plain skill name', () => {
    expect(isMalformedCompound('SQL')).toBe(false);
  });
});
