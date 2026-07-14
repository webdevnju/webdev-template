import { spawn } from "node:child_process";
import path from "node:path";

const appRoot = process.env.APP_ROOT ?? "/app";
const frontendPort = process.env.FRONTEND_PORT ?? "3000";
const children = [
  {
    name: "backend",
    process: spawn(process.execPath, ["bootstrap.js"], {
      cwd: path.join(appRoot, "backend"),
      env: {
        ...process.env,
        SERVICE_NAME: "backend",
      },
      stdio: "inherit",
    }),
  },
  {
    name: "frontend",
    process: spawn(process.execPath, ["server.js"], {
      cwd: path.join(appRoot, "frontend"),
      env: {
        ...process.env,
        HOSTNAME: "0.0.0.0",
        PORT: frontendPort,
        SERVICE_NAME: "frontend",
      },
      stdio: "inherit",
    }),
  },
];

let shuttingDown = false;
let requestedExitCode = 0;
let exitedChildren = 0;
let forceExitTimer;

function stopChildren(signal, exitCode) {
  if (shuttingDown) return;

  shuttingDown = true;
  requestedExitCode = exitCode;

  for (const child of children) {
    if (child.process.exitCode === null && child.process.signalCode === null) {
      child.process.kill(signal);
    }
  }

  forceExitTimer = setTimeout(() => {
    for (const child of children) {
      if (
        child.process.exitCode === null &&
        child.process.signalCode === null
      ) {
        child.process.kill("SIGKILL");
      }
    }
  }, 5000);
  forceExitTimer.unref();
}

for (const child of children) {
  child.process.on("error", (error) => {
    console.error(`[launcher] Failed to start ${child.name}:`, error);
    stopChildren("SIGTERM", 1);
  });

  child.process.on("close", (code, signal) => {
    exitedChildren += 1;

    if (!shuttingDown) {
      console.error(
        `[launcher] ${child.name} exited unexpectedly (${signal ?? code ?? "unknown"})`,
      );
      stopChildren("SIGTERM", code && code > 0 ? code : 1);
    }

    if (exitedChildren === children.length) {
      clearTimeout(forceExitTimer);
      process.exit(requestedExitCode);
    }
  });
}

process.on("SIGTERM", () => stopChildren("SIGTERM", 0));
process.on("SIGINT", () => stopChildren("SIGINT", 0));
