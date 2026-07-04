#!/usr/bin/env python3
"""NASTube — Reset complet.

Supprime :
  - Tous les processus Python qui écoutent sur le port NASTube
  - .venv/           (environnement virtuel)
  - dist/            (zip de l'extension)
  - backend/.env     (configuration + jeton API)
  - downloads/       (vidéos + base SQLite)
  - ffmpeg/          (binaires téléchargés)
  - start.bat / start.sh / launch.bat / launch.sh / nastube.bat
  - token.txt, icon.ico, server_err.log, server.log
  - Raccourcis bureau NASTube
  - Démarrage automatique Windows
  - __pycache__ partout

Ne touche PAS à : backend/, extension/, frontend/

Usage :  python reset.py
         python reset.py --force    (saute la confirmation)
"""
from __future__ import annotations

import os
import platform
import shutil
import signal
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
STORAGE_DEFAULT = ROOT / "downloads"
ENV_FILE = BACKEND / ".env"

C = {"r": "\033[31m", "g": "\033[32m", "y": "\033[33m", "x": "\033[0m", "B": "\033[1m"}


def say(msg, c="y"):
    print(f"{C.get(c, '')}{msg}{C['x']}")


def warn(msg):
    say(f"  ⚠  {msg}", "r")


def info(msg):
    say(f"  • {msg}", "y")


def done(msg):
    say(f"  ✓ {msg}", "g")


def confirm(msg: str) -> bool:
    r = input(f"\n{C['B']}? {msg} (o/N) {C['x']}").strip().lower()
    return r in ("o", "y", "ou", "yes")


def parse_env() -> dict:
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env[k] = v
    return env


def human_size(path: Path) -> str:
    total = 0
    if path.is_file():
        total = path.stat().st_size
    elif path.is_dir():
        for p in path.rglob("*"):
            if p.is_file():
                total += p.stat().st_size
    if total < 1024:
        return f"{total} o"
    elif total < 1024**2:
        return f"{total/1024:.1f} Ko"
    elif total < 1024**3:
        return f"{total/1024**2:.1f} Mo"
    return f"{total/1024**3:.1f} Go"


def item_count(path: Path) -> int:
    if not path.is_dir():
        return 0
    return sum(1 for _ in path.rglob("*")) + 1


def kill_nastube_processes():
    """Tue tous les processus Python qui écoutent sur le port NASTube (ou processus python du projet)."""
    killed = 0
    port = "8765"
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            if line.startswith("NASTUBE_PORT="):
                port = line.split("=", 1)[1].strip()
                break
    try:
        # netstat pour trouver les PID qui écoutent sur le port
        r = subprocess.run(
            ["netstat", "-ano"], capture_output=True, text=True, timeout=10
        )
        pids = set()
        for line in r.stdout.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                parts = line.strip().split()
                if parts:
                    pids.add(parts[-1])
        for pid in pids:
            try:
                os.kill(int(pid), signal.SIGTERM)
                killed += 1
            except (OSError, ValueError):
                pass
    except Exception:
        pass
    # fallback : tuer tous les python qui tournent depuis le dossier backend
    try:
        if platform.system() == "Windows":
            r = subprocess.run(
                ["tasklist", "/FI", "IMAGENAME eq python.exe", "/FO", "CSV"],
                capture_output=True, text=True, timeout=10
            )
            for line in r.stdout.splitlines()[1:]:
                parts = line.strip().split(",")
                if len(parts) >= 2:
                    pid = parts[1].strip('"')
                    try:
                        os.kill(int(pid), signal.SIGTERM)
                        killed += 1
                    except (OSError, ValueError):
                        pass
    except Exception:
        pass
    return killed


def main():
    force = "--force" in sys.argv

    say(f"\n{C['B']}🧹  NASTube — Réinitialisation complète{C['x']}\n", "r")
    warn("CE SCRIPT SUPPRIME TOUT : vidéos, base de données, configuration, venv.")
    warn("Cette action est IRRÉVERSIBLE.\n")

    env = parse_env()
    storage_str = env.get("NASTUBE_STORAGE_DIR", "")
    storage = Path(storage_str).expanduser().resolve() if storage_str else STORAGE_DEFAULT

    items = []

    # Processus
    k = kill_nastube_processes()
    if k:
        info(f"Processus terminés : {k}")

    # .venv
    venv = ROOT / ".venv"
    if venv.exists():
        items.append(("Environnement virtuel (.venv)", venv, True))

    # dist
    dist = ROOT / "dist"
    if dist.exists():
        items.append(("Extension packagée (dist/)", dist, True))

    # .env
    if ENV_FILE.exists():
        items.append(("Configuration (.env + jeton API)", ENV_FILE, True))

    token_init = ROOT / "frontend" / "init-token.json"
    if token_init.exists():
        items.append(("Jeton interface web (init-token.json)", token_init, True))

    # Scripts de démarrage / lancement
    for script in ["start.bat", "start.sh", "launch.bat", "launch.sh", "nastube.bat"]:
        p = ROOT / script
        if p.exists():
            items.append((f"Script ({script})", p, True))

    # token.txt, icon.ico, logs
    for f in ["token.txt", "icon.ico", "icon.png", "server_err.log", "server.log"]:
        p = ROOT / f
        if p.exists():
            items.append((f"Fichier ({f})", p, True))

    # Raccourci racine
    root_lnk = ROOT / "NASTube.lnk"
    if root_lnk.exists():
        items.append(("Raccourci racine (NASTube.lnk)", root_lnk, True))

    # Raccourcis bureau
    desktop = Path.home() / "Desktop"
    if not desktop.is_dir():
        desktop = Path.home() / "Bureau"
    if desktop.is_dir():
        for lnk_name in ["NASTube.lnk", "NASTube.desktop", "NASTube.command"]:
            p = desktop / lnk_name
            if p.exists():
                items.append((f"Raccourci bureau ({lnk_name})", p, True))

    # Démarrage automatique Windows
    autostart = Path(os.environ.get("APPDATA", "")) / "Microsoft/Windows/Start Menu/Programs/Startup" / "NASTube.bat"
    if autostart.exists():
        items.append(("Démarrage automatique Windows", autostart, True))

    # ffmpeg
    ffmpeg_dir = ROOT / "ffmpeg"
    if ffmpeg_dir.exists() and any(ffmpeg_dir.iterdir()):
        items.append((f"Binaires ffmpeg ({human_size(ffmpeg_dir)})", ffmpeg_dir, True))

    # Storage (vidéos + db)
    db_path = storage / "nastube.sqlite"
    storage_items = 0
    if storage.exists():
        if db_path.exists():
            storage_items += 1
        for p in storage.rglob("*"):
            if p.is_file() and p != db_path:
                storage_items += 1
        if storage_items > 0:
            items.append((f"Bibliothèque vidéo ({storage_items} fichiers, {human_size(storage)})", storage, True))

    if not items:
        info("Rien à supprimer — l'installation est déjà vierge.")
        return

    say(f"{C['B']}Récapitulatif :{C['x']}\n")
    for label, path, _ in items:
        sz = human_size(path)
        info(f"{label}" + (f"  ({sz})" if sz else ""))

    if not force:
        say("")
        if not confirm("Confirmer la suppression définitive ?"):
            say("Annulé.", "y")
            return

    say("")
    for label, path, _ in items:
        try:
            if path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink(missing_ok=True)
            done(f"{label}  → supprimé")
        except Exception as e:
            warn(f"{label}  → erreur : {e}")

    # __pycache__
    for cache in ROOT.rglob("__pycache__"):
        try:
            shutil.rmtree(cache)
        except Exception:
            pass

    say(f"\n{C['B']}✅  Réinitialisation terminée.{C['x']}", "g")
    say("Dossiers intacts : backend/, extension/, frontend/", "g")
    say("\nPour repartir de zéro :", "b")
    say("  python backend/app.py", "b")
    say("  http://localhost:8765\n", "b")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        say("\nAnnulé.", "y")
