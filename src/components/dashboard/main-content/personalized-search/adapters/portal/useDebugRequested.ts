import { useLocation } from 'react-router-dom';

/** Debug mode is `?debug=true` on the page URL. */
export const useDebugRequested = (): boolean => new URLSearchParams(useLocation().search).get('debug') === 'true';
