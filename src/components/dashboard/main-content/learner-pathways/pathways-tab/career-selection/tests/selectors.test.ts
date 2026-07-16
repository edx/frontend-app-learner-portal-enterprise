import { deriveSelectedCareer } from '../selectors';

const matches = [
  { id: 'career-1', title: 'Data Analyst' },
  { id: 'career-2', title: 'Business Analyst' },
];

describe('deriveSelectedCareer', () => {
  it('returns the match referenced by the selected id', () => {
    expect(deriveSelectedCareer(matches, 'career-2')).toEqual(matches[1]);
  });

  it('falls back to the first match when the id is stale', () => {
    expect(deriveSelectedCareer(matches, 'stale-id')).toEqual(matches[0]);
  });

  it('falls back to the first match when the id is null', () => {
    expect(deriveSelectedCareer(matches, null)).toEqual(matches[0]);
  });

  it('returns null when there are no matches', () => {
    expect(deriveSelectedCareer([], 'career-1')).toBeNull();
  });
});
