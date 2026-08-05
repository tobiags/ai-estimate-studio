import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const restrictedImports = (patterns) => ({
  "no-restricted-imports": [
    "error",
    {
      patterns: patterns.map((group) => ({
        group: [group, `${group}/*`],
        message: `Importing ${group} violates this package boundary.`,
      })),
    },
  ],
});

export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,tsx}"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ["packages/domain/**/*.{ts,tsx}"],
    rules: restrictedImports([
      "react",
      "next",
      "@prisma/client",
      "@ai-estimate-studio/application",
      "@ai-estimate-studio/contracts",
      "@ai-estimate-studio/db",
      "@ai-estimate-studio/pricing-engine",
      "@ai-estimate-studio/viewer-engine",
      "@ai-estimate-studio/ai",
      "@ai-estimate-studio/ui",
      "@ai-estimate-studio/providers",
    ]),
  },
  {
    files: ["packages/pricing-engine/**/*.{ts,tsx}"],
    rules: restrictedImports([
      "react",
      "next",
      "@prisma/client",
      "@ai-estimate-studio/application",
      "@ai-estimate-studio/db",
      "@ai-estimate-studio/ai",
      "@ai-estimate-studio/providers",
    ]),
  },
  {
    files: ["packages/viewer-engine/**/*.{ts,tsx}"],
    rules: restrictedImports([
      "@prisma/client",
      "@ai-estimate-studio/application",
      "@ai-estimate-studio/db",
      "@ai-estimate-studio/pricing-engine",
      "@ai-estimate-studio/ai",
      "@ai-estimate-studio/providers",
    ]),
  },
  {
    files: ["packages/contracts/**/*.{ts,tsx}"],
    rules: restrictedImports(["@prisma/client", "@ai-estimate-studio/db"]),
  },
);
