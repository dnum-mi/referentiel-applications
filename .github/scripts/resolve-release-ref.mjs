import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Résout un tag existant, y compris annoté, sans jamais rabattre sur HEAD. */
export function resolveReleaseRef(tag, cwd = process.cwd()) {
  if (
    typeof tag !== "string" ||
    !/^v[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(tag) ||
    tag.length > 128
  ) {
    throw new Error("Un tag v* compatible avec les tags Docker est requis.");
  }

  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();

  try {
    git("check-ref-format", `refs/tags/${tag}`);
    const commit = git("rev-parse", "--verify", `refs/tags/${tag}^{commit}`);
    if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(commit)) {
      throw new Error("Référence de commit invalide");
    }
    return { tag, commit };
  } catch (cause) {
    throw new Error(`Le tag ${tag} ne désigne pas un commit disponible.`, {
      cause,
    });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const { tag, commit } = resolveReleaseRef(process.env.RELEASE_TAG);
    const output = `tag=${tag}\ncommit=${commit}\n`;
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, output);
    } else {
      process.stdout.write(output);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
