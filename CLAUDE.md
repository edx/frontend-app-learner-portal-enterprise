# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

frontend-app-learner-portal-enterprise is a React-based micro-frontend within the Open edX ecosystem that provides the learner-facing enterprise portal where enterprise learners can discover courses, enroll in content, track their progress, and manage their subsidized learning.

## Test and Quality Instructions

- To run unit tests: `npm test`
- To run tests in watch mode: `npm run test:watch`
- To run linting: `npm run lint`
- To fix linting issues: `npm run lint:fix`
- To check TypeScript types: `npm run check-types`
- To build: `npm run build`

## Key Principles

- Search the codebase before assuming something isn't implemented
- Write comprehensive tests for new components using React Testing Library
- Follow existing code patterns and component structure
- Use Paragon components from `@openedx/paragon` - invoke the `/paragon` skill for guidance
- Keep changes focused and minimal
- Follow Test-Driven Development when refactoring or modifying existing functionality
- Always write tests for new functionality you implement

## Documentation & Institutional Memory

- Document new functionality in `docs/decisions/` using Architecture Decision Records (ADRs)
- When you learn something important about how this codebase works (gotchas, non-obvious
  patterns, integration quirks), capture it in this CLAUDE.md file or in an appropriate ADR
- These docs are institutional memory - future sessions (yours or others) will benefit
  from what you record here

## Development Commands

### Core Development
- `npm start` - Start dev server at http://localhost:8734
- `npm run start:stage` - Start dev server with staging webpack config
- `npm test` - Run Jest tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run test:watch:no-cov` - Run tests in watch mode without coverage

### Build Commands
- `npm run build` - Build production bundle
- `npm run build:with-theme` - Build with custom Paragon theme
- `npm run serve` - Serve built files from dist/
- `npm run build:serve` - Build and serve in one command

### Code Quality
- `npm run lint` - Run ESLint on JS/JSX/TS/TSX files
- `npm run lint:fix` - Fix linting issues automatically
- `npm run check-types` - TypeScript type checking
- `npm run check-types:watch` - TypeScript type checking in watch mode

### Internationalization
- `npm run i18n_extract` - Extract translation strings

### OpenAPI
- `npm run generate-openapi-types` - Generate TypeScript types from OpenAPI schemas

## Testing Framework

- **Test Runner**: Jest with jsdom environment
- **Test Utilities**: React Testing Library, user-event, jest-when
- **Mocking**: axios-mock-adapter for API calls, jest-localstorage-mock
- **Coverage**: Jest coverage reports in coverage/ directory
- **Single Test**: Use Jest's pattern matching (e.g., `npm test -- MyComponent.test.jsx`)

## Architecture Overview

This is a React 18 single-page application serving as the learner-facing enterprise portal within the Open edX ecosystem. See Architecture Decision Records in `docs/decisions/` for detailed technical decisions.

### Application Structure
This is a React 18 single-page application using:
- **Router**: React Router v6 with lazy-loaded routes and loaders
- **State Management**: TanStack Query for server state, React hooks for local state
- **Styling**: SCSS with Paragon design system (@openedx/paragon)
- **Build Tool**: Webpack via @openedx/frontend-build
- **TypeScript**: Mixed JS/TS codebase with gradual migration

### Route Structure
Routes are organized around enterprise customer slugs:
- `/:enterpriseSlug` - Dashboard (main landing)
- `/:enterpriseSlug/search` - Course/content search (Algolia-powered)
- `/:enterpriseSlug/course/:courseKey` - Course detail pages
- `/:enterpriseSlug/program/:programUUID` - Program pages
- `/:enterpriseSlug/pathway/:pathwayUUID/progress` - Learning pathway progress
- `/:enterpriseSlug/skills-quiz` - Skills assessment tool
- `/:enterpriseSlug/videos/:videoUUID` - Microlearning video content

### Key Concepts

- **Enterprise Customer**: A B2B customer organization that provides subsidized learning to their learners
- **Subsidy Types**: Learner credit, subscription licenses, coupon codes
- **Content Catalogs**: Enterprise-specific collections of courses/programs discoverable via Algolia
- **Assignments**: Content assigned to specific learners by enterprise admins
- **BFF Pattern**: Backend-for-Frontend aggregation layer for optimized data loading

### External Service Integration

- **enterprise-access**: Policy and assignment management, subsidy redemption (http://localhost:18270)
- **enterprise-subsidy**: Subsidy and transaction management (http://localhost:18280)
- **enterprise-catalog**: Content metadata and discovery (http://localhost:18160)
- **LMS**: User authentication and course enrollment (http://localhost:18000)
- **Algolia**: Course search and discovery
- **Braze**: Email notifications

### Local Development

- Runs on `localhost:8734`
- Start with: `npm start`
- Requires OpenEdX devstack with enterprise integration enabled
- Access via: `http://localhost:8734/{enterprise-slug}` (e.g., `http://localhost:8734/test-enterprise`)

### Key Components Architecture

#### Data Loading Pattern
- **Route Loaders**: Each major route has a loader (e.g., `makeDashboardLoader`, `makeCourseLoader`) that prefetches data
- **Custom Hooks**: Extensive use of custom hooks in `src/components/app/data/hooks/` for API integration
- **Query Keys**: Centralized query key factory pattern for cache management

#### Component Organization
- **Feature-based**: Components grouped by domain (course/, search/, dashboard/, etc.)
- **Data Co-location**: Each component folder contains:
  - Main component files
  - `data/` folder with hooks, services, utils
  - `tests/` folder with component tests
  - `styles/` folder with SCSS files

#### API Integration
- **Backend for Frontend (BFF)**: New pattern being adopted (`useBFF` hook)
- **Legacy APIs**: Direct service calls in `src/components/app/data/services/`
- **Enterprise APIs**: Integration with enterprise-catalog, enterprise-access, enterprise-subsidy services

### State Management Philosophy
- **Server State**: TanStack Query with 20-second stale time, automatic background refetching
- **Local State**: React useState/useContext for component-specific state
- **URL State**: React Router for navigation and route params
- **Moving Away from Redux**: ADR-0005 documents migration away from Redux

### Styling Approach
- **Design System**: Paragon components and utility classes as primary building blocks
- **SCSS Modules**: Feature-specific styles in component folders
- **Responsive Design**: Mobile-first approach
- **Theme Support**: Configurable via paragon theme installation

### Enterprise Integration
- **Multi-tenancy**: Routes prefixed with enterprise customer slug
- **Subsidy Management**: Integration with learner credit, subscriptions, coupon codes
- **Content Catalogs**: Algolia search integration for enterprise-specific content
- **User Management**: Enterprise customer user linking and authentication flows

### Performance Optimizations
- **Code Splitting**: Lazy loading of routes and heavy components
- **Bundle Analysis**: Webpack splitChunks with 244KB maxSize chunks
- **Query Optimization**: TanStack Query with strategic cache management
- **Resource Hints**: Preconnect to external domains (ADR-0011)

### Error Handling
- **Error Boundaries**: App-level error boundary with custom error pages
- **Query Errors**: Centralized error handling in query cache
- **404 Pages**: Custom NotFound components for unmatched routes

## Environment Setup

### Prerequisites
- Node.js (see .nvmrc file)
- OpenEdX devstack for backend services
- Enterprise customer setup (see README setup instructions)

### Key Environment Variables
- `LMS_BASE_URL` - Learning Management System URL
- `ENTERPRISE_ACCESS_BASE_URL` - Enterprise access service
- `ENTERPRISE_CATALOG_API_BASE_URL` - Catalog API
- `ALGOLIA_*` - Search service configuration
- Various feature flags and service URLs (see src/index.tsx)

### Local Development Setup
1. Clone repo, run `nvm install` and `nvm use` to ensure the correct Node version is installed, then `npm i` to install dependencies
2. Set up devstack with enterprise integration enabled
3. Create test enterprise customer via Django admin
4. Navigate to `http://localhost:8734/{enterprise-slug}`

## Testing Patterns

### Component Testing
- Use React Testing Library's user-centric queries
- Mock API calls with axios-mock-adapter
- Test user interactions, not implementation details
- Use jest-when for conditional mocking
- Leverage axe-core to conduct accessibility checks for every component

### Data Hook Testing
- Test loading, success, and error states
- Mock query client and API responses
- Verify proper error handling
- Test cache invalidation scenarios

### Integration Testing
- Focus on user workflows across components
- Test route transitions and data loading
- Verify enterprise-specific functionality
- Conduct visual review of components
