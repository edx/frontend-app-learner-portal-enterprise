# core

Framework-free TypeScript. No React, no `@edx/*`, no host imports.

- `stream/`: the turn stream contract (AI SDK UI Message Stream v1 over SSE): `types.ts`, `parseSse`, the `applyPart` reducer (it takes a block validator, so hosts with custom blocks keep them), and the golden fixtures.
- `transports/`: the `ChatTransport` port and its implementations (fixture, buffered, SSE). Network transports take an injected `getHttpClient` and `getBaseUrl` (`http.ts`).
- `workflows/`: hook-free turn logic the controller calls.
- `selectors.ts`: pure selectors over chat state.
- `api/`: enterprise-access clients (sessions, item feedback) over the injected HTTP client.
