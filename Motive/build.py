#!/usr/bin/env python3
"""
build.py
────────
Motive-KSP one-shot build script.

Run this from the project root — the folder that contains both
"Backend/" and "frontend/" as subfolders:

    python build.py

It only INSTALLS/PREPARES everything (Python venv + deps, npm deps,
Firestore demo-data seed). It does NOT start the servers — see the
instructions it prints at the end for that, since the backend and
frontend each need to keep running in their own terminal.

Works on Windows, macOS, and Linux (uses sys.executable / venv's own
bin-folder layout instead of hardcoding paths).
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "Backend"
FRONTEND = ROOT / "frontend"
IS_WINDOWS = os.name == "nt"


def header(text: str) -> None:
    print("\n" + "=" * 50)
    print(f"  {text}")
    print("=" * 50)


def step(text: str) -> None:
    print(f"\n[step] {text}")


def fail(text: str) -> None:
    print(f"\n[ERROR] {text}")
    input("Press Enter to exit...")
    sys.exit(1)


def run(cmd: list, cwd: Path, allow_fail: bool = False) -> bool:
    """Run a command, streaming output. Returns True on success."""
    printable = " ".join(str(c) for c in cmd)
    print(f"  $ {printable}")
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0 and not allow_fail:
        fail(f"Command failed ({printable}). Scroll up for the real error.")
    return result.returncode == 0


def venv_paths(venv_dir: Path):
    if IS_WINDOWS:
        return venv_dir / "Scripts" / "python.exe", venv_dir / "Scripts" / "pip.exe"
    return venv_dir / "bin" / "python", venv_dir / "bin" / "pip"


def main() -> None:
    header("Motive-KSP - Build")

    if not BACKEND.is_dir():
        fail(f'"Backend" folder not found at {BACKEND}')
    if not FRONTEND.is_dir():
        fail(f'"frontend" folder not found at {FRONTEND}')

    # ── Prereq checks ────────────────────────────────────────────────
    step("Checking Python...")
    print(f"  Using {sys.executable}")

    step("Checking Node.js / npm...")
    if shutil.which("node") is None:
        fail("Node.js was not found on PATH. Install the LTS version from https://nodejs.org/")
    npm = "npm.cmd" if IS_WINDOWS else "npm"
    if shutil.which(npm) is None:
        fail("npm was not found on PATH (usually installed together with Node.js).")
    run(["node", "--version"], cwd=ROOT, allow_fail=True)
    run([npm, "--version"], cwd=ROOT, allow_fail=True)

    # ── Backend: venv + pip install ─────────────────────────────────
    header("Backend setup")
    venv_dir = BACKEND / "venv"
    if not venv_dir.exists():
        step("Creating Python virtual environment...")
        run([sys.executable, "-m", "venv", "venv"], cwd=BACKEND)
    else:
        step("Virtual environment already exists, skipping creation.")

    venv_python, venv_pip = venv_paths(venv_dir)

    step("Upgrading pip...")
    run([str(venv_python), "-m", "pip", "install", "--upgrade", "pip"], cwd=BACKEND, allow_fail=True)

    step("Installing backend dependencies (this can take a few minutes)...")
    req = BACKEND / "requirements.txt"
    if not req.exists():
        fail(f"requirements.txt not found at {req}")
    run([str(venv_pip), "install", "-r", "requirements.txt"], cwd=BACKEND)

    # ── Backend: seed Firestore, only if creds are already in place ──
    header("Firestore demo-data seed")
    creds = BACKEND / "firebase-service-account.json"
    dataset = BACKEND / "data" / "karnataka_fir_dataset.json"
    seed_script = BACKEND / "uploadToFirestore.js"
    if creds.exists() and dataset.exists() and seed_script.exists():
        step("firebase-service-account.json found — seeding demo data...")
        fb_admin_dir = BACKEND / "node_modules" / "firebase-admin"
        if not fb_admin_dir.exists():
            run([npm, "install", "firebase-admin"], cwd=BACKEND)
        run(["node", "uploadToFirestore.js"], cwd=BACKEND)
    else:
        missing = [
            str(p.relative_to(BACKEND))
            for p in (creds, dataset, seed_script)
            if not p.exists()
        ]
        print(
            "  Skipping seed — missing: " + ", ".join(missing)
            + "\n  Add the missing file(s) and re-run this script, or run "
            "uploadToFirestore.js manually later (see README)."
        )

    # ── Frontend: npm install ───────────────────────────────────────
    header("Frontend setup")
    step("Installing frontend dependencies (this can take a few minutes)...")
    run([npm, "install"], cwd=FRONTEND)

    env_file = FRONTEND / ".env"
    env_example = FRONTEND / ".env.example"
    if not env_file.exists() and env_example.exists():
        shutil.copy(env_example, env_file)
        print(f"  Created {env_file.relative_to(ROOT)} from the template — "
              "fill in your Firebase web config before starting the frontend.")

    # ── Done ─────────────────────────────────────────────────────────
    header("Build complete")
    activate = "venv\\Scripts\\activate" if IS_WINDOWS else "source venv/bin/activate"
    print(f"""
To start the app, open TWO terminals:

  1) Backend:
     cd Backend
     {activate}
     uvicorn app:app --reload --port 8000

  2) Frontend:
     cd frontend
     npm run dev

Make sure Backend/.env (Gemini + Firebase keys) and frontend/.env
(Firebase web config) are filled in first.
""")
    input("Press Enter to exit...")


if __name__ == "__main__":
    main()
