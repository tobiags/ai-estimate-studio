# ADR-0005: Use S3-compatible object storage for assets

## Status

Proposed

## Decision

Store GLB/GLTF, images, posters and PDFs in private S3-compatible storage. Browsers use short-lived signed upload/read URLs where privacy requires it; published assets are served through a controlled CDN path. Local/Docker development uses MinIO.

## Consequences

The application remains portable across AWS S3, Cloudflare R2 and compatible services. Asset metadata and publication are database concerns. Upload, scanning, processing and CDN invalidation require explicit jobs.

## Alternatives considered

Vercel Blob is operationally simple but more vendor-specific. Database blobs impair backups and delivery. Repository-hosted models cannot support admin publishing.
