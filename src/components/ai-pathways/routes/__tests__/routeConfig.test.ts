import { ROUTES } from '../routeConfig';

describe('routeConfig', () => {
  it('defines correct routes', () => {
    expect(ROUTES.INTAKE).toBe('intake');
    expect(ROUTES.PROFILE).toBe('profile');
    expect(ROUTES.PATHWAY).toBe('pathway');
  });
});
