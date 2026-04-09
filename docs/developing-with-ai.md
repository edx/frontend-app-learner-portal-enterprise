# Developing with AI

This repository supports Claude Code out of the box via a top-level `CLAUDE.md` file and
team plugins from our shared marketplace.

## Getting Started

For complete setup instructions, security best practices, and workflow guidance, see the
**[Getting Started with Claude Code](https://github.com/edx/ai-devtools-internal/blob/main/docs/getting-started.md)**
guide in our team's ai-devtools-internal repository.

## Quick Reference

### Key Files

- `CLAUDE.md` - Project context and instructions for Claude
- `.claude/settings.json` - Plugin and permission configuration
- `.claude/settings.local.json` - Personal overrides (gitignored)

### Enabled Plugins

This repo uses the `edx-enterprise-frontend-plugin` which provides:
- `/paragon` skill for Paragon design system guidance

### Architecture Decision Records

This repository uses Architecture Decision Records (ADRs) to document significant architectural
decisions. See `docs/decisions/` for existing ADRs. When working with Claude Code on significant
architectural changes, consider documenting the decision in a new ADR.

## Security Reminder

Always ensure you have [gitleaks](https://github.com/gitleaks/gitleaks) installed with a
pre-commit hook to prevent accidental credential commits. See the
[Getting Started guide](https://github.com/edx/ai-devtools-internal/blob/main/docs/getting-started.md#security-best-practices)
for setup instructions.

## Local Development with AI

When using Claude Code for local development:

1. Ensure your local devstack is running (see README.md for setup)
2. The MFE runs on `http://localhost:8734`
3. You'll need an enterprise customer slug to test (e.g., `test-enterprise`)
4. Access the portal at `http://localhost:8734/{enterprise-slug}`

## Testing with AI

Claude Code can help write tests using:
- Jest as the test runner
- React Testing Library for component testing
- `npm test` to run the test suite
- `npm run test:watch` for test-driven development

Make sure to follow existing test patterns in the codebase and test user interactions
rather than implementation details.
