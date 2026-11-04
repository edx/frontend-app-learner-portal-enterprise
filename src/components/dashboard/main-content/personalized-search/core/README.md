# core

Framework-free TypeScript. No React, no `@edx/*`, no host imports.

- `stream/`: the turn stream contract (AI SDK UI Message Stream v1 over SSE): `types.ts`, `parseSse`, the `applyPart` reducer, and the golden fixtures.
- `transports/`: the `ChatTransport` port and its implementations (fixture, buffered). Network transports take an injected `getHttpClient` and `getBaseUrl` (`http.ts`).
