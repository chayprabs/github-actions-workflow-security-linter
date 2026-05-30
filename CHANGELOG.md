# Changelog

## Unreleased

### Added

- Home-page analyzer: paste, upload, import, and review workflows at `/`.
- Terms and Conditions page at `/terms`.
- `# gha-ignore` suppression comments (legacy `# authos-ignore` alias supported).
- Post-deploy smoke script (`npm run smoke:prod`).

### Changed

- Removed Authos branding; standalone **GHA Workflow Analyzer** product.
- Parse warnings (duplicate keys, multi-document YAML) no longer block security rule analysis.
- Workflow-level ignore comments can suppress top-level findings such as missing permissions.
- Legacy tool URL redirects to `/`.

### Fixed

- `GHA901` ignore-comment warnings always surface even when a custom rule allowlist is enabled.
- Share URL payloads validate decompressed size and sanitize share state.

## 0.1.0

- Initial GitHub Actions workflow security and lint analyzer.
