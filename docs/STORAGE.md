# Logixa Flow — Storage

> Owner: Backend / Operations
> Update when: storage routing, provider selection, size limits, or live verification changes
> Last Updated: 2026-10-09
> Do NOT put here: credentials.

## Routing policy

- Images and thumbnails up to 10 MB → Cloudinary.
- Documents up to 50 MB → Supabase Storage.
- Files above 50 MB and up to 5 GB → Backblaze B2/S3-compatible storage.
- Export reports and workflow backup artifacts → Google Drive.

## Configuration

Render configuration identifies Cloudinary as the primary upload backend and Supabase/B2 as fallback backends. B2 uses the S3-compatible endpoint, application key ID/secret, bucket name, and region. The bucket may remain Private: S3_PUBLIC_BASE_URL is optional, and B2 files are returned through an opaque application URL (/api/uploads/files/<id>) that streams the object using server-side S3 authentication. Do not make the bucket public or add a payment method just to satisfy the B2 release gate. If an explicitly public bucket or custom CDN is used, S3_PUBLIC_BASE_URL remains an optional delivery override. Google Drive uses authorized-user OAuth credential JSON and an optional export folder ID. OAuth refresh must preserve the scopes recorded in the credential; when scopes are absent, do not inject a new scope into the refresh request. The live gate should fail with an explicit re-authorization instruction when refresh returns `invalid_scope`.

## Verification

Implementation/configuration is present in the repository. Cloudinary live E2E and private B2 authenticated S3 upload/read/delete are verified. B2 evidence: Live Release Gates run #12 on 2026-10-09, https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37947429179. The deployed application download-proxy path (/api/uploads/files/<id>) still needs a production E2E check that uploads through the application, fetches the opaque URL, and verifies content plus safe response headers. Supabase Storage and Google Drive live E2E remain release gates. Google Drive Live Release Gates run #13 failed on 2026-10-09 during OAuth token refresh (`invalid_scope`), before upload; evidence: https://github.com/T2W1-LOGIXA-FLOW/Logixa-Flow-/actions/runs/37951151765. The release gate fix preserves credential-recorded scopes, avoids requesting an unrecorded scope, validates write-scope metadata when present, and reports actionable OAuth remediation. The live gate remains pending until a fresh run verifies upload/read/delete. Earlier B2 public-GET failures relate to the superseded public-URL design and are not the target behavior for a Private bucket.

## Security

Service-role and provider secrets remain backend-side. Public frontend configuration must never contain private provider credentials.
