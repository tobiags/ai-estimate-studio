# ADR-0004: Use provider-neutral structured AI generation

## Status
Proposed

## Decision
Use the Vercel AI SDK as transport abstraction behind an `AiRecommendationProvider` port owned by the AI package. The default production adapter may target OpenAI, but domain inputs/outputs use provider-neutral schemas. No provider SDK types cross the adapter boundary.

## Consequences
Provider replacement and test doubles are practical. Lowest-common-denominator structured generation is preferred over provider-specific agents. Prompt/version evaluation is a release concern.

## Alternatives considered
Direct provider SDK use creates lock-in. A full agent framework and vector database add complexity without an MVP retrieval need; approved relational content can be assembled deterministically.

