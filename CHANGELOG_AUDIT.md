# Changelog Audit (Phase 0-1)

## [Unreleased]

### Added
- Rate limit helper and Zod validation utilities for API routes.
- Pagination helper with consistent response shape for large listings.
- Environment documentation and security hardening notes.

### Changed
- Added rate limiting to auth, appointment creation, and search endpoints.
- Added Zod validation for forgot/reset password and appointment creation payloads.
- Paginated appointment, patient, professional, service, and professional patient list endpoints.
- Updated front-end list fetches to consume paginated responses.
- Added baseline security headers (CSP, HSTS, referrer policy, permissions policy).
- Expanded `.env.example` to include all configuration keys.

### Fixed
- Safer fallbacks in API request handling for malformed inputs.

### Security
- Enforced rate limiting and input validation on critical routes.
- Added production-grade security headers.

