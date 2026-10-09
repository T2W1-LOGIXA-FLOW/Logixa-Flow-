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

Render configuration identifies Cloudinary as the primary upload backend and Supabase/B2 as fallback backends. B2 uses S3-compatible endpoint/access/bucket/region settings. `S3_PUBLIC_BASE_URL` must be a public download base, not the S3 API endpoint. For a native Backblaze download host, the storage helper accepts the host root (`https://fXXX.backblazeb2.com`), `/file`, or the full `/file/<bucket>` prefix and ensures the bucket segment is included. Custom domains should point at the bucket and remain unchanged. Google Drive uses credential JSON and an optional export folder ID.

## Verification

Implementation/configuration is present in the repository. Cloudinary live E2E is verified; Supabase Storage, B2, and Google Drive remain release gates. The 2026-10-09 B2 run proved S3 API upload/readback works but public download returned HTTP 400; public URL construction was hardened for native Backblaze URL formats and the gate now emits a sanitized diagnostic if public access still fails.

## Security

Service-role and provider secrets remain backend-side. Public frontend configuration must never contain private provider credentials.
