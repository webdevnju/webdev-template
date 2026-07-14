import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function createFixture({ backendSource, frontendSource }) {
  const root = await mkdtemp(path.join(tmpdir(), "course-demo-launcher-"));
  await mkdir(path.join(root, "backend"));
  await mkdir(path.join(root, "frontend"));
  await writeFile(path.join(root, "backend/bootstrap.js"), backendSource);
  await writeFile(path.join(root, "frontend/server.js"), frontendSource);
  return root;
}

function runLauncher(appRoot, extraEnvironment = {}) {
  return spawn(process.execPath, ["infra/start.mjs"], {
    cwd: path.resolve(import.meta.dirname, ".."),
    env: {
      ...process.env,
      ...extraEnvironment,
      APP_ROOT: appRoot,
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
}

function waitForClose(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
}

async function waitForFile(filePath, attempts = 50) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await readFile(filePath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw new Error(`Timed out waiting for ${filePath}`);
}

const signalAwareService = `
const { writeFileSync } = require("node:fs");
const path = require("node:path");
const signalFile = path.join(
  process.env.SIGNAL_DIRECTORY,
  process.env.SERVICE_NAME + ".signal",
);
writeFileSync(
  path.join(
    process.env.SIGNAL_DIRECTORY,
    process.env.SERVICE_NAME + ".ready",
  ),
  "ready",
);
process.on("SIGTERM", () => {
  writeFileSync(signalFile, "SIGTERM");
  process.exit(0);
});
setInterval(() => {}, 1000);
`;

test("launcher forwards SIGTERM to both services and exits successfully", async (t) => {
  const appRoot = await createFixture({
    backendSource: signalAwareService,
    frontendSource: signalAwareService,
  });
  t.after(() => rm(appRoot, { recursive: true, force: true }));
  const backendSignalFile = path.join(appRoot, "backend.signal");
  const frontendSignalFile = path.join(appRoot, "frontend.signal");
  const launcher = runLauncher(appRoot, {
    SIGNAL_DIRECTORY: appRoot,
  });

  await Promise.all([
    waitForFile(path.join(appRoot, "backend.ready")),
    waitForFile(path.join(appRoot, "frontend.ready")),
  ]);
  launcher.kill("SIGTERM");

  const result = await waitForClose(launcher);
  assert.equal(result.code, 0);
  assert.equal(await waitForFile(backendSignalFile), "SIGTERM");
  assert.equal(await waitForFile(frontendSignalFile), "SIGTERM");
});

test("launcher stops the peer and fails when one service exits", async (t) => {
  const appRoot = await createFixture({
    backendSource: "setTimeout(() => process.exit(7), 100);",
    frontendSource: signalAwareService,
  });
  t.after(() => rm(appRoot, { recursive: true, force: true }));
  const frontendSignalFile = path.join(appRoot, "frontend.signal");
  const launcher = runLauncher(appRoot, {
    SIGNAL_DIRECTORY: appRoot,
  });

  const result = await waitForClose(launcher);
  assert.equal(result.code, 7);
  assert.equal(await waitForFile(frontendSignalFile), "SIGTERM");
});
