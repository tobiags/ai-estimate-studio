# ADR-0009: PDF export with a Forme browser renderer and a static fallback

## Status

Accepted — 2026-08-15

## Context

The estimator must download a professional PDF from a GitHub Pages deployment.
The referenced [pdfcn repository](https://github.com/shadcn-labs/pdfcn) is a
copy/paste component gallery built on Forme and Takumi rather than a small
runtime package. Installing the whole gallery would add its demo application,
its own routing, and unnecessary dependencies to the configurator.

## Decision

Use the underlying Forme packages (`@formepdf/react` and
`@formepdf/core/browser`) for the premium, tagged browser PDF. The document is
composed from the same data contract as the existing export and keeps the
configuration, environment, tax, and total visible in one page.

Keep the existing `pdf-lib` renderer as a runtime fallback. A static host may
reject or fail to initialize WebAssembly; the download action must still
produce a valid PDF instead of failing. No server endpoint or paid provider is
required.

## Consequences

- The browser bundle includes the Forme WASM renderer only when the export
  feature is used.
- PDF generation is still fully client-side and compatible with the GitHub
  Pages deployment model.
- `pdfcn` visual ideas can be adopted as local components without coupling the
  product to the gallery's application shell.
- The fallback remains covered by the existing `pdf-lib` unit test; browser QA
  must exercise the download button once per release.
