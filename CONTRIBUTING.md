# Contributing

AI Estimate Studio is documentation-first. Read [docs/README.md](docs/README.md), the affected normative specifications and [the Git workflow](docs/git/GIT_WORKFLOW.md) before proposing a change.

## Design phase

- Documentation changes target `main`.
- Do not add application scaffolding, implementation code, generated clients or migrations until the implementation roadmap is explicitly approved.
- Use stable requirement/acceptance IDs and update all affected cross-references.
- Architecture changes require an ADR; API changes update both `API.md` and `openapi.yaml`; data changes update both data documents.

## Pull request expectations

State the problem, affected requirements, decision/trade-offs, documents changed, validation evidence and compatibility/security/privacy impact. Keep scope focused. Resolve contradictions in the same pull request rather than creating an undocumented exception.

## Validation

Documentation pull requests must pass Markdown/local-link checks, Mermaid parsing and:

```text
npx @redocly/cli lint --config docs/api/redocly.yaml docs/api/openapi.yaml
```

Implementation-phase commands and gates are defined in the approved roadmap and quality strategy. A behavioral change is incomplete until its normative documentation and verification evidence are updated.
