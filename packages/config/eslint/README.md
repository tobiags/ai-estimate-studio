# Shared ESLint policy

The root flat configuration is the only executable ESLint policy. It applies
TypeScript correctness rules and package-boundary restrictions by workspace
path so packages cannot override architectural constraints locally.
