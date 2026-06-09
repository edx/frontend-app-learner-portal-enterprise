import * as PathwaysTab from './index';

describe('pathways-tab public exports', () => {
  it('exports scaffold seams and state utilities', () => {
    expect(PathwaysTab.LearnerPathwaysTab).toBeDefined();
    expect(PathwaysTab.usePathwaysController).toBeDefined();
    expect(PathwaysTab.generateProfileWorkflow).toBeDefined();
    expect(PathwaysTab.generatePathwayWorkflow).toBeDefined();
    expect(PathwaysTab.usePathwaysStore).toBeDefined();
    expect(PathwaysTab.selectors).toBeDefined();
  });
});
