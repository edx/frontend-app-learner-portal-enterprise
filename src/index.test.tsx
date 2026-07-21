export {};

const APP_READY = 'frontend.app.ready';
const APP_INIT_ERROR = 'frontend.app.initError';

const mockCreateRoot = jest.fn(() => ({ render: jest.fn() }));
const mockInitialize = jest.fn();
const mockSubscribe = jest.fn();
const mockMergeConfig = jest.fn();

// Mock factories close over the fns above (rather than creating them inline) so their
// identity survives jest.resetModules() between tests, which re-invokes each factory.
jest.mock('react-dom/client', () => ({ createRoot: mockCreateRoot }));
jest.mock('@edx/frontend-platform', () => ({
  APP_READY,
  APP_INIT_ERROR,
  initialize: mockInitialize,
  subscribe: mockSubscribe,
}));
jest.mock('@edx/frontend-platform/config', () => ({ mergeConfig: mockMergeConfig }));
jest.mock('@edx/frontend-platform/react', () => ({ ErrorPage: () => null }));
jest.mock('./i18n', () => ({}));
jest.mock('./components/app', () => ({ App: () => null }));
jest.mock('./styles/index.scss', () => ({}));

describe('src/index.tsx bootstrap', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockCreateRoot.mockClear();
    mockInitialize.mockClear();
    mockSubscribe.mockClear();
    mockMergeConfig.mockClear();
    document.body.innerHTML = '<div id="root"></div>';
    process.env = { ...originalEnv };
    delete process.env.FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('renders the App into the #root container on APP_READY', () => {
    mockSubscribe.mockImplementation((topic, callback) => {
      if (topic === APP_READY) {
        callback();
      }
    });

    // eslint-disable-next-line global-require
    require('./index');

    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById('root'));
  });

  it('renders the ErrorPage into the #root container on APP_INIT_ERROR', () => {
    mockSubscribe.mockImplementation((topic, callback) => {
      if (topic === APP_INIT_ERROR) {
        callback(new Error('boom'));
      }
    });

    // eslint-disable-next-line global-require
    require('./index');

    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById('root'));
  });

  it('defaults FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS to an empty array when unset', () => {
    // eslint-disable-next-line global-require
    require('./index');

    const { handlers } = mockInitialize.mock.calls[0][0];
    handlers.config();

    expect(mockMergeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS: [] }),
    );
  });

  it('passes through FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS when set', () => {
    process.env.FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS = 'uuid-1,uuid-2';

    // eslint-disable-next-line global-require
    require('./index');

    const { handlers } = mockInitialize.mock.calls[0][0];
    handlers.config();

    expect(mockMergeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ FEATURE_ENABLE_LEARNER_PATHWAYS_FOR_ENTERPRISE_CUSTOMERS: 'uuid-1,uuid-2' }),
    );
  });
});
