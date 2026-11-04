/**
 * The HTTP client the core needs: an axios-like `get`/`post`/`delete` that sends the learner's
 * credentials. Hosts inject one; the learner portal passes `getAuthenticatedHttpClient()`.
 */
export interface HttpRequestConfig {
  params?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface HttpResponse<T> {
  data: T;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface HttpClient {
  get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  post<T = any>(url: string, body?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Read per request: hosts usually configure their client after startup. */
export type GetHttpClient = () => HttpClient;

/** Where the core's requests go: the host's client and the enterprise-access base URL. */
export interface ApiOptions {
  getHttpClient: GetHttpClient;
  /** enterprise-access base URL, read per request so a config change applies without a reload. */
  getBaseUrl: () => string;
}
