# Engineering documentation index

## Document conventions

- **Normative** documents define behavior that implementation must satisfy.
- **Informative** documents provide context and may not override normative requirements.
- Requirement IDs are stable. Product requirements use `FR-*` and `NFR-*`; acceptance criteria use `AC-*`.
- Monetary values are integer minor units plus ISO 4217 currency codes.
- Times are ISO 8601 UTC unless a document explicitly describes presentation in the organization timezone.
- “Must” is mandatory, “should” is recommended, and “may” is optional.

## Index

| Area | Document | Status | Owner |
|---|---|---|---|
| Product | [Product specification](product/PRODUCT_SPEC.md) | Normative, proposed | Product |
| UX | [UX specification](ux/UX_SPEC.md) | Normative, proposed | Product design |
| Architecture | [System architecture](architecture/SYSTEM_ARCHITECTURE.md) | Normative, proposed | Architecture |
| Architecture | [C4 model](architecture/C4.md) | Normative, proposed | Architecture |
| Architecture | [Repository and package design](architecture/REPOSITORY_STRUCTURE.md) | Normative, proposed | Architecture |
| Architecture | [Key sequence diagrams](architecture/SEQUENCES.md) | Normative, proposed | Architecture |
| Viewer | [Generic Object Viewer specification](viewer/OBJECT_VIEWER.md) | Normative, proposed | 3D engineering |
| Viewer | [3D generation provider evaluation](viewer/GENERATION_PROVIDER_EVALUATION.md) | Informative decision record | 3D engineering |
| Viewer | [text-to-cad evaluation](viewer/TEXT_TO_CAD_EVALUATION.md) | Informative decision record | 3D engineering |
| Architecture | [ClayGL renderer decision](architecture/adr/0007-claygl-premium-renderer.md) | Accepted decision record | Architecture + 3D engineering |
| Data | [Domain and data model](data/DATA_MODEL.md) | Normative, proposed | Architecture |
| Database | [Prisma schema design](data/PRISMA_SCHEMA.md) | Normative, proposed | Data engineering |
| Pricing | [Pricing engine specification](pricing/PRICING_SPEC.md) | Normative, proposed | Product + Finance |
| AI | [AI subsystem specification](ai/AI_SYSTEM.md) | Normative, proposed | AI engineering |
| Admin | [Administration specification](admin/ADMIN_SPEC.md) | Normative, proposed | Product |
| API | [API conventions and endpoint catalog](api/API.md) | Normative, proposed | API engineering |
| API | [OpenAPI 3.1 contract](api/openapi.yaml) | Normative, proposed | API engineering |
| Deployment | [Deployment and environments](deployment/DEPLOYMENT.md) | Normative, proposed | Platform engineering |
| Quality | [Quality strategy](quality/QUALITY_STRATEGY.md) | Normative, proposed | Quality engineering |
| Security | [Security and privacy](quality/SECURITY_PRIVACY.md) | Normative, proposed | Security |
| Git | [Engineering workflow](git/GIT_WORKFLOW.md) | Normative, proposed | Engineering management |
| Roadmap | [Implementation roadmap](roadmap/IMPLEMENTATION_ROADMAP.md) | Normative after approval | Technical program management |
| Decisions | [Architecture decision log](architecture/adr/README.md) | Normative | Architecture |

## Approval and change control

1. A proposed document becomes approved through a pull request with Product and Architecture review.
2. Any change to an approved requirement includes affected requirement IDs, migration impact, test impact, and an ADR when architecture changes.
3. OpenAPI and the Prisma design must remain consistent with the domain model.
4. Pricing and AI may explain or recommend, but only the deterministic pricing engine computes totals.
5. GitHub Pages publishes this directory only; it never hosts the application.

## Traceability

Every roadmap task cites requirements and acceptance criteria. Implementation pull requests must cite the roadmap task, test evidence, and affected documents. A release cannot close a requirement without automated or explicitly documented manual evidence.
