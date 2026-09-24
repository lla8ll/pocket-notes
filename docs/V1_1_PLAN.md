# Pocket Notes v1.1 — Implementation Plan

## Delivered
- Core UX: folders, tags, favorites, advanced filters/search.
- Storage: IndexedDB note store alongside the existing LocalStorage migration/conflict path.
- Attachments: local IndexedDB blobs plus note metadata.
- Import/Export: JSON import and JSON/Markdown export.

## Next milestones
- Repository abstraction and storage health UI.
- Attachment preview/download/delete and quota reporting.
- Markdown/TXT/ZIP import/export.
- Mobile E2E coverage.
- Optional cloud sync, then version history/conflict resolution.
- Optional AI services behind explicit user actions.
