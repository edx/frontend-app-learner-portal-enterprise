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
This feature follows a **sealed boundary** pattern. All logic required for the AI Pathways experience should reside within this directory to ensure it remains portable and easy to maintain.

## Integration
The main entry point is `index.ts`, which exports `AIPathwaysTab` and `AiPathwaysPage`.

## Current Status
- **Prototype Fidelity**: High. The complete "Intake -> Profile -> Pathway" flow is functional.
- **UI System**: 100% Paragon. No Ionic or styled-components are used.
- **Service Layer**: Fully functional with OpenAI structured output support and robust stubs for local development.
- **Cleanup & Normalization**: Completed. All exports follow a consistent named export pattern.
- **Isolation**: Verified. No external coupling to legacy pathways logic.

## Future Considerations
- Migrate OpenAI calls from the client-side `OpenAIPathwaysService` to a secure backend proxy.
- Integrate with real learner profile data from the platform instead of generating it from intake responses.
- Replace stubs with actual platform enrollment and course progress APIs.
