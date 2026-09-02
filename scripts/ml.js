#!/usr/bin/env node
/**
 * Cross-platform helper for the Python ML service and training pipeline.
 *
 *   node scripts/ml.js install   create ml/.venv and install requirements
 *   node scripts/ml.js train     run the training pipeline (writes ml/artifacts)
 *   node scripts/ml.js serve     start the FastAPI service (uvicorn)
 *   node scripts/ml.js test      run pytest
 *
 * Uses ml/.venv when it exists (created by `install`). Reads ML_HOST and
 * ML_PORT from ml/.env when present. Works on Windows, macOS and Linux.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mlDir = path.join(root, "ml");
const isWin = process.platform === "win32";
const venvDir = path.join(mlDir, ".venv");
const venvPython = isWin ? path.join(venvDir, "Scripts", "python.exe") : path.join(venvDir, "bin", "python");

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: mlDir, shell: false, ...opts });
  if (res.error) {
    console.error(`Failed to start ${cmd}: ${res.error.message}`);
    process.exit(1);
  }
  return res.status ?? 1;
}

function findSystemPython() {
  const candidates = isWin ? [["py", ["-3"]], ["python", []], ["python3", []]] : [["python3", []], ["python", []]];
  for (const [cmd, args] of candidates) {
    const res = spawnSync(cmd, [...args, "--version"], { stdio: "ignore" });
    if (!res.error && res.status === 0) return { cmd, args };
  }
  console.error("Python 3 was not found on PATH. Install Python 3.11 or newer and try again.");
  process.exit(1);
}

function pythonFor(action) {
  if (existsSync(venvPython)) return { cmd: venvPython, args: [] };
  if (action !== "install") {
    console.warn("ml/.venv not found; falling back to the system Python. Run `npm run install:ml` first for an isolated environment.");
  }
  return findSystemPython();
}

function readMlEnv() {
  const file = path.join(mlDir, ".env");
  const env = {};
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
  }
  return env;
}

const action = process.argv[2];
const extra = process.argv.slice(3);

switch (action) {
  case "install": {
    const py = findSystemPython();
    if (!existsSync(venvPython)) {
      console.log("Creating ml/.venv ...");
      if (run(py.cmd, [...py.args, "-m", "venv", venvDir]) !== 0) process.exit(1);
    }
    console.log("Installing ML requirements ...");
    let status = run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"]);
    if (status === 0) status = run(venvPython, ["-m", "pip", "install", "-r", "requirements.txt"]);
    if (status === 0 && existsSync(path.join(mlDir, "requirements-dev.txt"))) {
      status = run(venvPython, ["-m", "pip", "install", "-r", "requirements-dev.txt"]);
    }
    process.exit(status);
  }
  case "train": {
    const py = pythonFor(action);
    process.exit(run(py.cmd, [...py.args, "-m", "training.run_pipeline", ...extra]));
  }
  case "serve": {
    const py = pythonFor(action);
    const env = { ...readMlEnv(), ...process.env };
    const host = env.ML_HOST || "127.0.0.1";
    const port = env.ML_PORT || "8000";
    process.exit(
      run(py.cmd, [...py.args, "-m", "uvicorn", "app.main:app", "--host", host, "--port", String(port), ...extra], { env }),
    );
  }
  case "test": {
    const py = pythonFor(action);
    process.exit(run(py.cmd, [...py.args, "-m", "pytest", "-q", ...extra]));
  }
  default:
    console.error("Usage: node scripts/ml.js <install|train|serve|test> [extra args]");
    process.exit(2);
}
