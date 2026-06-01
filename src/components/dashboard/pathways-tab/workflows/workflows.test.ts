import {
  generatePathwayWorkflow,
  generateProfileWorkflow,
} from './index';

describe('pathways workflows scaffolds', () => {
  it('resolves profile workflow without payload', async () => {
    await expect(generateProfileWorkflow()).resolves.toBeUndefined();
  });

  it('resolves profile workflow with payload', async () => {
    await expect(generateProfileWorkflow({
      payload: { motivation: 'career growth' },
    })).resolves.toBeUndefined();
  });

  it('resolves pathway workflow without payload', async () => {
    await expect(generatePathwayWorkflow()).resolves.toBeUndefined();
  });

  it('resolves pathway workflow with payload', async () => {
    await expect(generatePathwayWorkflow({
      payload: { selectedCareerId: 'career-1' },
    })).resolves.toBeUndefined();
  });
});
