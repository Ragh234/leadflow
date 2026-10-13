import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/** Reseed the API's database so every walkthrough starts from the same demo data. */
export default function globalSetup() {
  const backend = path.resolve(__dirname, "../../backend");
  const python = [".venv/Scripts/python.exe", ".venv/bin/python"]
    .map((candidate) => path.join(backend, candidate))
    .find((candidate) => existsSync(candidate));

  if (!python) {
    console.warn("backend/.venv not found; skipping reseed. Run `python seed.py` yourself first.");
    return;
  }
  execFileSync(python, ["seed.py"], { cwd: backend, stdio: "inherit" });
}
