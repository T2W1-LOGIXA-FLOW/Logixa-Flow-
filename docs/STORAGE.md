# Logixa Flow — Storage

> Owner: Backend / Operations
> Update when: storage routing, provider selection, size limits, or live verification changes
> Last Updated: 2026-10-08
> Do NOT put here: credentials.

## Routing policy

- Images and thumbnails up to 10 MB → Cloudinary.
- Documents up to 50 MB → Supabase Storage.
- Files above 50 MB and up to 5 GB → Backblaze B2/S3-compatible storage.
- Export reports and workflow backup artifacts → Google Drive.

## Configuration

Render configuration identifies Cloudinary as the primary upload backend and Supabase/B2 as fallback backends. B2 uses S3-compatible endpoint/access/bucket/region settings. Google Drive uses credential JSON and an optional export folder ID.

## Verification

Implementation/configuration is present in the repository. Real Cloudinary, Supabase Storage, B2, and Google Drive E2E remain release gates.

## Security

Service-role and provider secrets remain backend-side. Public frontend configuration must never contain private provider credentials.
