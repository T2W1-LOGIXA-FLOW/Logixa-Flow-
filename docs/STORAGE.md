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

Render configuration identifies Cloudinary as the primary upload backend and Supabase/B2 as fallback backends. B2 uses the S3-compatible endpoint, application key ID/secret, bucket name, and region. The bucket may remain Private: S3_PUBLIC_BASE_URL is optional, and B2 files are returned through an opaque application URL (/api/uploads/files/<id>) that streams the object using server-side S3 authentication. Do not make the bucket public or add a payment method just to satisfy the B2 release gate. If an explicitly public bucket or custom CDN is used, S3_PUBLIC_BASE_URL remains an optional delivery override. Google Drive uses credential JSON and an optional export folder ID.

## Verification

Implementation/configuration is present in the repository. Cloudinary live E2E is verified; Supabase Storage, B2, and Google Drive remain release gates. Earlier B2 runs proved S3 API upload/readback works but public GET returned HTTP 400. The B2 gate now verifies authenticated upload/read/delete for a private bucket; application-level proxy streaming is covered by repository tests and must be deployed before it is considered live-verified.

## Security

Service-role and provider secrets remain backend-side. Public frontend configuration must never contain private provider credentials.
