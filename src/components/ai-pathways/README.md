# AI Pathways Feature

This directory is a self-contained prototype of the **Learning Pathways** application, migrated from `xpert-labs/apps/learning-pathways`.

## Goals
- Provide a faithful working prototype of the source application inside the Learner Portal.
- Use **Paragon** as the design system.
- Maintain a modular, decoupled architecture for portability.
- Isolate feature logic from the legacy learner portal pathways.

## Folder Structure
- `components/`: Modular UI components (Intake, Profile, Pathway).
- `hooks/`: Feature-local React hooks for business logic and state.
- `services/`: API client abstractions and local stubs.
- `routes/`: Page-level components and route configuration.
- `utils/`: Local helper functions and formatters.
- `constants/`: Static configuration and data catalogs.
- `types/`: Domain-specific TypeScript interfaces.
- `mocks/`: JSON mock data for development and testing.
- `styles/`: Component-level and feature-local SCSS.
- `__tests__/`: Unit and integration tests.

## Architecture
The AI Pathways feature follows a **modular, multi-phase retrieval architecture** to ensure clean separation between semantic intent and structured metadata.

### Data Flow
1. **Intake Form**: User provides goals and background.
2. **Metadata Bootstrap (Phase A)**: A deterministic Algolia call (empty query) fetches available facets (skills, industries) to inform the UI and OpenAI.
3. **Intent Extraction (Phase B)**: OpenAI parses user prose into a structured `SearchIntent` object, using bootstrap facets for normalization.
4. **Structured Retrieval (Phase C)**: A targeted Algolia call uses structured filters from `SearchIntent` to find relevant careers and content.
5. **Pathway Assembly**: Results are normalized and assembled into a learning journey with AI-driven reasoning.

### Key Layers
- **Intent Extraction Layer**: OpenAI Structured Outputs for semantic parsing.
- **Request Builder Layer**: Deterministic mapping from intent to Algolia parameters.
- **Retrieval Layer**: Imperative Algolia search using the `Taxonomy` index.
- **Adapter Layer**: Normalization of raw provider hits into stable feature-local contracts.
- **Presentation Layer**: UI components that consume only normalized models.

## Current Status
- **Algolia Integration**: Phase A (Bootstrap) and Phase C (Refined) search are fully implemented and bug-free.
- **OpenAI Integration**: Intent extraction is using Structured Outputs and is informed by real taxonomy metadata.
- **UI System**: 100% Paragon. No Ionic or styled-components are used.
- **Service Layer**: Fully functional with clean boundaries and provider isolation.
- **Cleanup & Normalization**: Completed. All exports follow a consistent named export pattern.
- **Isolation**: Verified. No external coupling to legacy pathways logic.

## Future Considerations
- Migrate OpenAI calls from the client-side `OpenAIPathwaysService` to a secure backend proxy.
- Integrate with real learner profile data from the platform instead of generating it from intake responses.
- Replace stubs with actual platform enrollment and course progress APIs.
