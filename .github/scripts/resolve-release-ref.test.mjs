import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { resolveReleaseRef } from "./resolve-release-ref.mjs";

let directory;
let taggedCommit;
let currentCommit;
const git = (...args) =>
  execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();

before(() => {
  directory = mkdtempSync(join(tmpdir(), "refapp-release-ref-"));
  git("init", "--quiet");
  git("config", "user.name", "RefApp CI test");
  git("config", "user.email", "ci-test@example.invalid");
  git("config", "commit.gpgsign", "false");
  git("config", "tag.gpgsign", "false");
  writeFileSync(join(directory, "version.txt"), "ancienne version\n");
  git("add", "version.txt");
  git("commit", "--quiet", "-m", "feat: first version");
  taggedCommit = git("rev-parse", "HEAD");
  git("tag", "v1.2.3");
  git("tag", "-a", "v1.2.4-rc.1", "-m", "Annotated release");
  writeFileSync(join(directory, "version.txt"), "version plus récente\n");
  git("commit", "--quiet", "-am", "feat: next version");
  currentCommit = git("rev-parse", "HEAD");
  git("branch", "v9.9.9");
});

after(() => {
  if (directory) rmSync(directory, { recursive: true, force: true });
});

test("un rattrapage construit le commit tagué plutôt que le HEAD actuel", () => {
  assert.notEqual(taggedCommit, currentCommit);
  assert.deepEqual(resolveReleaseRef("v1.2.3", directory), {
    tag: "v1.2.3",
    commit: taggedCommit,
  });
});

test("un tag annoté est déréférencé vers son commit", () => {
  assert.deepEqual(resolveReleaseRef("v1.2.4-rc.1", directory), {
    tag: "v1.2.4-rc.1",
    commit: taggedCommit,
  });
});

test("une branche homonyme ne remplace pas un tag absent", () => {
  assert.throws(() => resolveReleaseRef("v9.9.9", directory), /tag v9.9.9/);
});

test("un tag absent est refusé au lieu de construire main", () => {
  assert.throws(() => resolveReleaseRef("v8.8.8", directory), /tag v8.8.8/);
});

test("les références ambiguës et les valeurs incompatibles Docker sont refusées", () => {
  for (const tag of [
    undefined,
    "",
    "main",
    "v1..2",
    "v1.2.3\nother=value",
    "v1.2.3+build",
    "v1.2.3,latest",
    "v1.2.3^{tree}",
    `v${"1".repeat(128)}`,
  ]) {
    assert.throws(() => resolveReleaseRef(tag, directory));
  }
});

test("le CLI transmet exactement le tag et le commit via GITHUB_OUTPUT", () => {
  const outputFile = join(directory, "outputs.txt");
  writeFileSync(outputFile, "existing=value\n");
  execFileSync(
    process.execPath,
    [fileURLToPath(new URL("./resolve-release-ref.mjs", import.meta.url))],
    {
      cwd: directory,
      env: { ...process.env, RELEASE_TAG: "v1.2.3", GITHUB_OUTPUT: outputFile },
    },
  );
  assert.equal(
    readFileSync(outputFile, "utf8"),
    `existing=value\ntag=v1.2.3\ncommit=${taggedCommit}\n`,
  );
});
