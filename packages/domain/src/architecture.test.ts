import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = `${directory}/${entry.name}`;
      return entry.isDirectory()
        ? sourceFiles(path)
        : entry.name.endsWith(".test.ts")
          ? []
          : [path];
    }),
  );
  return nested.flat();
}

describe("domain package boundaries", () => {
  it("contains no framework, ORM or provider imports", async () => {
    const root = fileURLToPath(new URL(".", import.meta.url));
    const files = await sourceFiles(root);
    const forbidden =
      /(?:from|import\s*\()\s*["'](?:react|next|@prisma|@ai-estimate-studio\/(?:db|providers))/;

    for (const file of files) {
      expect(await readFile(file, "utf8"), file).not.toMatch(forbidden);
    }
  });
});
