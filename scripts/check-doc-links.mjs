import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const repositoryRoot = process.cwd();
const markdownFiles = [
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CHANGELOG.md",
];

function collectMarkdown(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectMarkdown(path);
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      markdownFiles.push(path);
    }
  }
}

collectMarkdown("docs");

const failures = [];
const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;

for (const markdownFile of markdownFiles) {
  const content = readFileSync(markdownFile, "utf8").replace(
    /```[\s\S]*?```/g,
    "",
  );

  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1]?.trim().replace(/^<|>$/g, "");
    if (
      !rawTarget ||
      rawTarget.startsWith("#") ||
      /^(?:https?:|mailto:)/i.test(rawTarget)
    ) {
      continue;
    }

    const pathOnly = decodeURIComponent(rawTarget.split("#", 1)[0] ?? "");
    const candidate = pathOnly.startsWith("/")
      ? resolve(repositoryRoot, `.${pathOnly}`)
      : resolve(dirname(markdownFile), pathOnly);
    const candidateExists =
      existsSync(candidate) ||
      existsSync(`${candidate}.md`) ||
      (existsSync(candidate) &&
        statSync(candidate).isDirectory() &&
        existsSync(join(candidate, "README.md")));

    if (!candidateExists) {
      failures.push(`${markdownFile}: ${rawTarget}`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(
    `Broken local Markdown links:\n${failures.join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Validated local links in ${markdownFiles.length} Markdown files.\n`,
  );
}
