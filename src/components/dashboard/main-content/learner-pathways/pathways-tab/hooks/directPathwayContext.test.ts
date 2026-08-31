import { DIRECT_PATHWAY_CONTEXT_UNAVAILABLE_MESSAGE, DirectPathwayContextUnavailableError } from './directPathwayContext';

describe('DirectPathwayContextUnavailableError', () => {
  it('carries the stable, exported message', () => {
    expect(new DirectPathwayContextUnavailableError().message).toBe(DIRECT_PATHWAY_CONTEXT_UNAVAILABLE_MESSAGE);
  });

  it('is a real Error instance named DirectPathwayContextUnavailableError', () => {
    const error = new DirectPathwayContextUnavailableError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DirectPathwayContextUnavailableError');
  });
});
