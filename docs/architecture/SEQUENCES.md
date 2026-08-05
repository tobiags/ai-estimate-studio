# Key Sequence Diagrams

## Configuration and repricing

```mermaid
sequenceDiagram
  actor Buyer
  participant UI as Configurator UI
  participant API as Configuration API
  participant App as Application service
  participant Price as Pricing engine
  participant DB as PostgreSQL
  Buyer->>UI: Change option or dimension
  UI->>UI: Optimistic local validation
  UI->>API: PATCH configuration (version, selection)
  API->>App: Validate identity, revision and payload
  App->>DB: Load organization-scoped pinned catalog
  App->>Price: evaluate(explicit input)
  Price-->>App: line items, total, trace, violations
  alt valid
    App->>DB: Commit configuration + version
    App-->>API: normalized configuration + price
    API-->>UI: 200
  else invalid or conflict
    App-->>API: domain problem
    API-->>UI: 409/422 RFC 7807
  end
```

## AI recommendation

```mermaid
sequenceDiagram
  actor Buyer
  participant API
  participant Context as Context builder
  participant AI as AI abstraction
  participant Provider
  participant Verify as Output verifier
  Buyer->>API: Request guidance with budget/goal
  API->>Context: Load allowlisted current snapshot
  Context-->>AI: bounded context + schema + prompt version
  AI->>Provider: structured generation
  Provider-->>AI: candidate JSON
  AI->>Verify: schema, entity IDs, compatibility, price claims
  alt verified
    Verify-->>API: recommendation
    API-->>Buyer: 201 structured guidance
  else invalid/timeout
    Verify-->>API: safe unavailable result
    API-->>Buyer: 422/503; quote flow unaffected
  end
```

## Quote issue and PDF

```mermaid
sequenceDiagram
  actor Buyer
  participant API
  participant Quote as Quote service
  participant Price as Pricing engine
  participant DB
  participant Job as Job runner
  participant Store as Object storage
  Buyer->>API: POST quote + Idempotency-Key
  API->>Quote: Issue command
  Quote->>DB: Lock configuration/idempotency record
  Quote->>Price: Revalidate and calculate
  Price-->>Quote: authoritative result
  Quote->>DB: Commit immutable snapshot, consent, PDF job
  Quote-->>Buyer: 202 quote + PDF pending
  Job->>DB: Claim PDF job
  Job->>Store: Write generated PDF
  Job->>DB: Mark PDF ready
  Buyer->>API: GET quote by public token
  API-->>Buyer: PDF ready URL
```

## Catalog publication

```mermaid
sequenceDiagram
  actor Admin
  participant API
  participant Validator
  participant DB
  participant Cache
  Admin->>API: PUT publication with expected version
  API->>Validator: Validate graph, assets, locales, pricing simulations
  Validator->>DB: Read organization draft
  alt valid and current
    API->>DB: Transaction: immutable revision + audit
    API->>Cache: Revalidate organization/catalog tags
    API-->>Admin: 200 revision
  else invalid or stale
    API-->>Admin: 409/422 with actionable violations
  end
```

