import * as index from '../index';

describe('ai-pathways index', () => {
  it('exports expected components and constants', () => {
    expect(index.AiPathwaysPage).toBeDefined();
    expect(index.ROUTES).toBeDefined();
    expect(index.AIPathwaysTab).toBeDefined();
  });
});
