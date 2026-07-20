import { isMalformedCompound, normalizeString, quoteFacetValue } from './algoliaStrings';

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

describe('quoteFacetValue', () => {
  it('wraps the value in double quotes', () => {
    expect(quoteFacetValue('SQL')).toBe('"SQL"');
  });

  it('escapes embedded double quotes', () => {
    expect(quoteFacetValue('12" Monitor')).toBe('"12\\" Monitor"');
  });
});
