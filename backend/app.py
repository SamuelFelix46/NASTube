"""NASTube backend — FastAPI + yt-dlp + SQLite.

Endpoints:
  POST   /api/auth/register         {username, email, password} -> creer un compte
  POST   /api/auth/login            {login, password}           -> connexion (login=email ou username)
  POST   /api/auth/logout                                        -> deconnexion (X-User-Token)
  GET    /api/auth/me                                            -> infos utilisateur courant
  GET    /api/auth/users                                         -> liste des comptes

  POST   /api/enqueue               {url, source?}              -> ajouter une video
  POST   /api/enqueue_bulk          {urls: [...], source?}      -> ajouter plusieurs videos
  GET    /api/videos                -> lister mes videos (?status=&favorite=&q=&sort=&limit=)
  GET    /api/videos/{id}           -> detail d'une video
  DELETE /api/videos/{id}           -> supprimer une video
  POST   /api/videos/{id}/favorite  {value: bool}
  POST   /api/videos/{id}/watch     {seconds: int, position: int}
  POST   /api/videos/{id}/retry
  GET    /api/queue                 -> file de telechargement
  GET    /api/stats                 -> statistiques de l'utilisateur
  GET    /api/settings              / PUT /api/settings
  POST   /api/cleanup               -> nettoyage
  GET    /media/{filename}          -> stream video
  GET    /api/health
  GET    /api/network

Tous les endpoints (sauf auth/health/network/media) requierent:
  X-API-Token: <NASTUBE_API_TOKEN>
  X-User-Token: <token_utilisateur>
Les videos sont isolees par utilisateur — chacun ne voit que ses propres videos.
"""
from __future__ import annotations

import asyncio
import hashlib
import os
import secrets
import shutil
import socket
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import (Boolean, Column, DateTime, ForeignKey, Integer, String,
                        Text, create_engine, func, or_, select, update)
from sqlalchemy.orm import DeclarativeBase, Session

import yt_dlp


# ---------- config ----------
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NASTUBE_", env_file=".env", extra="ignore")
    storage_dir: str = "./downloads"
    max_quality: int = 1080
    max_concurrent: int = 2
    min_free_gb: int = 20
    max_total_gb: int = 500
    keep_days: int = 30
    enable_shorts: bool = False
    enable_playlists: bool = True
    scan_interval_min: int = 15
    clean_interval_hours: int = 6
    host: str = "0.0.0.0"
    port: int = 8765
    api_token: str = "change-me"
    ffmpeg_path: str = ""
    cookies_from_browser: str = ""


settings = Settings()
if settings.api_token == "change-me":
    settings.api_token = secrets.token_hex(16)
    env_path = Path(__file__).resolve().parent / ".env"
    env_path.write_text(f"NASTUBE_API_TOKEN={settings.api_token}\n", encoding="utf-8")
STORAGE = Path(settings.storage_dir).expanduser().resolve()
STORAGE.mkdir(parents=True, exist_ok=True)
DB_PATH = STORAGE / "nastube.sqlite"
FRONTEND = Path(__file__).resolve().parent.parent / "frontend"

# ---------- db ----------
engine = create_engine(
    f"sqlite:///{DB_PATH}", future=True, connect_args={"check_same_thread": False}
)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    avatar = Column(String(32), default="")
    token = Column(String(64), unique=True, index=True)
    token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Video(Base):
    __tablename__ = "videos"
    id = Column(Integer, primary_key=True)
    youtube_id = Column(String(32), unique=True, index=True)
    url = Column(Text, nullable=False)
    title = Column(Text, default="")
    channel = Column(Text, default="")
    channel_url = Column(Text, default="")
    description = Column(Text, default="")
    duration = Column(Integer, default=0)
    filesize = Column(Integer, default=0)
    filename = Column(Text, default="")
    thumbnail = Column(Text, default="")
    status = Column(String(16), default="queued")  # queued|downloading|done|error|skipped
    error = Column(Text, default="")
    source = Column(String(32), default="manual")  # manual|reco|playlist|shorts
    is_favorite = Column(Boolean, default=False, index=True)
    watch_count = Column(Integer, default=0)
    watch_seconds = Column(Integer, default=0)
    last_position = Column(Integer, default=0)
    user_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    downloaded_at = Column(DateTime, nullable=True)
    last_seen_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_watched_at = Column(DateTime, nullable=True)


Base.metadata.create_all(engine)

# best-effort migrations for older DBs
with engine.begin() as _conn:
    _tables = {r[0] for r in _conn.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "users" not in _tables:
        _conn.exec_driver_sql("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username VARCHAR(64) NOT NULL UNIQUE,
                email VARCHAR(128) NOT NULL UNIQUE,
                password_hash VARCHAR(128) NOT NULL,
                avatar VARCHAR(32) DEFAULT '',
                token VARCHAR(64) UNIQUE,
                created_at DATETIME
            )
        """)
        _conn.exec_driver_sql("CREATE INDEX ix_users_username ON users(username)")
        _conn.exec_driver_sql("CREATE INDEX ix_users_token ON users(token)")
    _cols = {r[1] for r in _conn.exec_driver_sql("PRAGMA table_info(videos)").fetchall()}
    _user_cols = {r[1] for r in _conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()}
    for name, ddl in [
        ("token_expires_at", "ALTER TABLE users ADD COLUMN token_expires_at DATETIME"),
    ]:
        if name not in _user_cols:
            _conn.exec_driver_sql(ddl)
    for name, ddl in [
        ("channel_url", "ALTER TABLE videos ADD COLUMN channel_url TEXT DEFAULT ''"),
        ("description", "ALTER TABLE videos ADD COLUMN description TEXT DEFAULT ''"),
        ("is_favorite", "ALTER TABLE videos ADD COLUMN is_favorite BOOLEAN DEFAULT 0"),
        ("watch_count", "ALTER TABLE videos ADD COLUMN watch_count INTEGER DEFAULT 0"),
        ("watch_seconds", "ALTER TABLE videos ADD COLUMN watch_seconds INTEGER DEFAULT 0"),
        ("last_position", "ALTER TABLE videos ADD COLUMN last_position INTEGER DEFAULT 0"),
        ("last_watched_at", "ALTER TABLE videos ADD COLUMN last_watched_at DATETIME"),
        ("user_id", "ALTER TABLE videos ADD COLUMN user_id INTEGER DEFAULT NULL"),
    ]:
        if name not in _cols:
            _conn.exec_driver_sql(ddl)


# ---------- helpers ----------
def extract_youtube_id(url: str) -> Optional[str]:
    import re
    m = re.search(r"(?:v=|youtu\.be/|/shorts/|/embed/)([A-Za-z0-9_-]{11})", url)
    return m.group(1) if m else None


def disk_free_gb() -> float:
    return shutil.disk_usage(STORAGE).free / (1024 ** 3)


def storage_used_gb() -> float:
    total = 0
    for p in STORAGE.rglob("*"):
        if p.is_file():
            total += p.stat().st_size
    return total / (1024 ** 3)


def _to_dict(r: Video, *, with_description: bool = False) -> dict:
    d = {
        "id": r.id, "youtube_id": r.youtube_id, "url": r.url, "title": r.title,
        "channel": r.channel, "channel_url": r.channel_url,
        "duration": r.duration, "filesize": r.filesize,
        "filename": r.filename, "thumbnail": r.thumbnail, "status": r.status,
        "error": r.error, "source": r.source,
        "is_favorite": bool(r.is_favorite),
        "watch_count": r.watch_count or 0,
        "watch_seconds": r.watch_seconds or 0,
        "last_position": r.last_position or 0,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "downloaded_at": r.downloaded_at.isoformat() if r.downloaded_at else None,
        "last_watched_at": r.last_watched_at.isoformat() if r.last_watched_at else None,
    }
    if with_description:
        d["description"] = r.description or ""
    return d


# ---------- download worker ----------
_semaphore: asyncio.Semaphore  # set in startup


_cookies_browser: str = ""

def _ydl_opts() -> dict:
    fmt = (
        f"bestvideo[height<={settings.max_quality}]+bestaudio/best[height<={settings.max_quality}]"
    )
    opts = {
        "format": fmt,
        "outtmpl": str(STORAGE / "%(title).120B [%(id)s].%(ext)s"),
        "merge_output_format": "mp4",
        "noprogress": True,
        "quiet": True,
        "no_warnings": True,
        "writethumbnail": False,
        "concurrent_fragment_downloads": 4,
        "extractor_retries": 3,
        "file_access_retries": 3,
    }
    if settings.ffmpeg_path:
        opts["ffmpeg_location"] = settings.ffmpeg_path
    if COOKIES_FILE.exists():
        opts["cookies"] = str(COOKIES_FILE)
    elif _cookies_browser:
        opts["cookiesfrombrowser"] = (_cookies_browser,)
    elif settings.cookies_from_browser:
        opts["cookiesfrombrowser"] = (settings.cookies_from_browser,)
    return opts


def _download_sync(url: str) -> dict:
    with yt_dlp.YoutubeDL(_ydl_opts()) as ydl:
        info = ydl.extract_info(url, download=True)
        if "entries" in info:
            info = info["entries"][0]
        filename = ydl.prepare_filename(info)
        p = Path(filename)
        if not p.exists():
            mp4 = p.with_suffix(".mp4")
            if mp4.exists():
                p = mp4
        return {
            "id": info.get("id"),
            "title": info.get("title", ""),
            "channel": info.get("uploader", ""),
            "channel_url": info.get("uploader_url") or info.get("channel_url", ""),
            "description": (info.get("description") or "")[:8000],
            "duration": int(info.get("duration") or 0),
            "thumbnail": info.get("thumbnail", ""),
            "filename": p.name,
            "filesize": p.stat().st_size if p.exists() else 0,
        }


async def _process_video(video_id: int) -> None:
    async with _semaphore:
        with Session(engine) as s:
            v = s.get(Video, video_id)
            if not v or v.status not in ("queued", "error"):
                return
            v.status = "downloading"
            s.commit()
            url = v.url

        try:
            if disk_free_gb() < settings.min_free_gb:
                await _cleanup()
                if disk_free_gb() < settings.min_free_gb:
                    raise RuntimeError("Not enough free space")

            data = await asyncio.to_thread(_download_sync, url)
            with Session(engine) as s:
                v = s.get(Video, video_id)
                v.status = "done"
                v.youtube_id = data["id"] or v.youtube_id
                v.title = data["title"]
                v.channel = data["channel"]
                v.channel_url = data["channel_url"]
                v.description = data["description"]
                v.duration = data["duration"]
                v.thumbnail = data["thumbnail"]
                v.filename = data["filename"]
                v.filesize = data["filesize"]
                v.downloaded_at = datetime.now(timezone.utc)
                s.commit()
        except Exception as e:  # noqa: BLE001
            with Session(engine) as s:
                v = s.get(Video, video_id)
                v.status = "error"
                v.error = str(e)[:500]
                s.commit()


async def _enqueue_id(video_id: int) -> None:
    asyncio.create_task(_process_video(video_id))


# ---------- cleanup ----------
async def _cleanup() -> dict:
    removed = 0
    freed = 0
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.keep_days)
    with Session(engine) as s:
        rows = list(s.scalars(select(Video).where(Video.status == "done")))
        rows.sort(key=lambda r: r.downloaded_at or r.created_at)
        for r in rows:
            if r.is_favorite:  # jamais supprimer un favori
                continue
            if (r.downloaded_at or r.created_at) < cutoff:
                p = STORAGE / r.filename
                if p.exists():
                    freed += p.stat().st_size
                    p.unlink(missing_ok=True)
                s.delete(r)
                removed += 1
        s.commit()

        while storage_used_gb() > settings.max_total_gb:
            r = s.scalars(
                select(Video)
                .where(Video.status == "done", Video.is_favorite == False)  # noqa: E712
                .order_by(Video.downloaded_at.asc())
            ).first()
            if not r:
                break
            p = STORAGE / r.filename
            if p.exists():
                freed += p.stat().st_size
                p.unlink(missing_ok=True)
            s.delete(r)
            removed += 1
            s.commit()
    return {"removed": removed, "freed_gb": round(freed / (1024 ** 3), 2)}


def _cleanup_tokens():
    with Session(engine) as s:
        now = datetime.now(timezone.utc)
        s.execute(
            update(User)
            .where(User.token_expires_at < now)
            .values(token=None, token_expires_at=None)
        )
        s.commit()


# ---------- api ----------
app = FastAPI(title="NASTube", version="0.3.0")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


TOKEN_DAYS = 90

def auth(request: Request, x_api_token: str = Header(default="")):
    host = request.client.host if request.client else ""
    if host in ("127.0.0.1", "::1", "localhost"):
        return
    if x_api_token != settings.api_token:
        raise HTTPException(401, "invalid token")


def _hash_password(pw: str) -> str:
    salt = secrets.token_hex(16)
    hsh = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100_000).hex()
    return f"pbkdf2:{salt}:{hsh}"


def _check_password(pw: str, stored: str) -> bool:
    if stored.startswith("pbkdf2:"):
        _, salt, hsh = stored.split(":", 2)
        return hsh == hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100_000).hex()
    return stored == hashlib.sha256(pw.encode()).hexdigest()


def _make_token() -> str:
    return secrets.token_hex(32)


def _token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS)


def _user_or_none(x_user_token: str = Header(default="")) -> Optional[User]:
    if not x_user_token:
        return None
    with Session(engine) as s:
        u = s.scalars(select(User).where(User.token == x_user_token)).first()
        if u and u.token_expires_at and u.token_expires_at < datetime.now(timezone.utc):
            u.token = None
            u.token_expires_at = None
            s.commit()
            return None
        return u


def _user_required(current_user: User = Depends(_user_or_none)):
    if not current_user:
        raise HTTPException(401, "authentification requise — X-User-Token manquant ou invalide")
    return current_user


class RegisterIn(BaseModel):
    username: str
    email: str
    password: str
    avatar: str = ""


class LoginIn(BaseModel):
    login: str
    password: str


class EnqueueIn(BaseModel):
    url: str
    source: str = "manual"


class BulkIn(BaseModel):
    urls: list[str]
    source: str = "reco"


class FavoriteIn(BaseModel):
    value: bool = True


class WatchIn(BaseModel):
    seconds: int = 0
    position: int = 0


class CookiesIn(BaseModel):
    cookies: str


class SettingsIn(BaseModel):
    max_quality: Optional[int] = None
    max_concurrent: Optional[int] = None
    min_free_gb: Optional[int] = None
    max_total_gb: Optional[int] = None
    keep_days: Optional[int] = None
    enable_shorts: Optional[bool] = None
    enable_playlists: Optional[bool] = None
    scan_interval_min: Optional[int] = None
    clean_interval_hours: Optional[int] = None
    cookies_from_browser: Optional[str] = None


def _queue_url(url: str, source: str, user_id: int) -> Optional[int]:
    if "/shorts/" in url and not settings.enable_shorts:
        return None
    yid = extract_youtube_id(url)
    if not yid:
        return None
    if not user_id:
        return None
    with Session(engine) as s:
        existing = s.scalars(select(Video).where(Video.youtube_id == yid, Video.user_id == user_id)).first()
        if existing:
            existing.last_seen_at = datetime.now(timezone.utc)
            existing.user_id = user_id
            s.commit()
            if existing.status in ("done", "downloading", "queued"):
                return existing.id
            existing.status = "queued"
            s.commit()
            return existing.id
        v = Video(youtube_id=yid, url=url, source=source, status="queued", user_id=user_id)
        s.add(v)
        s.commit()
        return v.id


# ---------- auth ----------
@app.post("/api/auth/register")
def register(inp: RegisterIn):
    inp.username = inp.username.strip()
    inp.email = inp.email.strip().lower()
    if len(inp.username) < 2 or len(inp.password) < 4:
        raise HTTPException(400, "username (min 2 chars) and password (min 4 chars)")
    with Session(engine) as s:
        if s.scalars(select(User).where(
            or_(User.username == inp.username, User.email == inp.email)
        )).first():
            raise HTTPException(409, "username or email already taken")
        u = User(
            username=inp.username,
            email=inp.email,
            password_hash=_hash_password(inp.password),
            avatar=inp.avatar or "",
            token=_make_token(),
            token_expires_at=_token_expiry(),
        )
        s.add(u)
        s.commit()
        return {
            "user": {"id": u.id, "username": u.username, "email": u.email, "avatar": u.avatar or ""},
            "token": u.token,
        }


@app.post("/api/auth/login")
def login(inp: LoginIn):
    with Session(engine) as s:
        login = inp.login.strip().lower()
        u = s.scalars(
            select(User).where((User.email == login) | (User.username == login))
        ).first()
        if not u or not _check_password(inp.password, u.password_hash):
            raise HTTPException(401, "identifiants invalides")
        if not u.password_hash.startswith("pbkdf2:"):
            u.password_hash = _hash_password(inp.password)
        u.token = _make_token()
        u.token_expires_at = _token_expiry()
        s.commit()
        return {
            "user": {"id": u.id, "username": u.username, "email": u.email, "avatar": u.avatar or ""},
            "token": u.token,
        }


@app.post("/api/auth/logout")
def logout(current_user: User = Depends(_user_required)):
    with Session(engine) as s:
        u = s.get(User, current_user.id)
        u.token = None
        u.token_expires_at = None
        s.commit()
    return {"ok": True}


@app.get("/api/auth/me")
def me(current_user: User = Depends(_user_required)):
    return {"id": current_user.id, "username": current_user.username, "email": current_user.email, "avatar": current_user.avatar or ""}


@app.get("/api/auth/users")
def list_users():
    with Session(engine) as s:
        users = s.scalars(select(User).order_by(User.username)).all()
        return [{"id": u.id, "username": u.username, "email": u.email, "avatar": u.avatar or ""} for u in users]


# ---------- videos ----------
@app.post("/api/enqueue", dependencies=[Depends(auth)])
async def enqueue(inp: EnqueueIn, current_user: User = Depends(_user_required)):
    vid = _queue_url(inp.url, inp.source, current_user.id)
    if vid is None:
        return {"ok": False, "reason": "invalid or disabled"}
    await _enqueue_id(vid)
    return {"ok": True, "id": vid}


@app.post("/api/enqueue_bulk", dependencies=[Depends(auth)])
async def enqueue_bulk(inp: BulkIn, current_user: User = Depends(_user_required)):
    ids = []
    for u in inp.urls:
        v = _queue_url(u, inp.source, current_user.id)
        if v:
            ids.append(v)
            await _enqueue_id(v)
    return {"ok": True, "queued": len(ids)}


@app.get("/api/videos")
def list_videos(
    status: Optional[str] = None,
    favorite: Optional[bool] = None,
    q: Optional[str] = None,
    sort: str = "recent",
    limit: int = 200,
    current_user: User = Depends(_user_required),
):
    with Session(engine) as s:
        stmt = select(Video).where(Video.user_id == current_user.id)
        if status:
            stmt = stmt.where(Video.status == status)
        if favorite is True:
            stmt = stmt.where(Video.is_favorite == True)  # noqa: E712
        if q:
            like = f"%{q}%"
            stmt = stmt.where(or_(Video.title.ilike(like), Video.channel.ilike(like)))
        if sort == "watched":
            stmt = stmt.order_by(Video.last_watched_at.desc().nullslast())
        elif sort == "popular":
            stmt = stmt.order_by(Video.watch_count.desc(), Video.created_at.desc())
        else:
            stmt = stmt.order_by(Video.created_at.desc())
        stmt = stmt.limit(limit)
        return [_to_dict(r) for r in s.scalars(stmt)]


@app.get("/api/videos/{vid}")
def get_video(vid: int, current_user: User = Depends(_user_required)):
    with Session(engine) as s:
        v = s.scalars(select(Video).where(Video.id == vid, Video.user_id == current_user.id)).first()
        if not v:
            raise HTTPException(404, "not found")
        return _to_dict(v, with_description=True)


@app.post("/api/videos/{vid}/favorite", dependencies=[Depends(auth)])
def toggle_favorite(vid: int, inp: FavoriteIn, current_user: User = Depends(_user_required)):
    with Session(engine) as s:
        v = s.scalars(select(Video).where(Video.id == vid, Video.user_id == current_user.id)).first()
        if not v:
            raise HTTPException(404, "not found")
        v.is_favorite = bool(inp.value)
        s.commit()
        return {"ok": True, "is_favorite": v.is_favorite}


@app.post("/api/videos/{vid}/watch", dependencies=[Depends(auth)])
def track_watch(vid: int, inp: WatchIn, current_user: User = Depends(_user_required)):
    with Session(engine) as s:
        v = s.scalars(select(Video).where(Video.id == vid, Video.user_id == current_user.id)).first()
        if not v:
            raise HTTPException(404, "not found")
        if (v.last_position or 0) == 0 and inp.position > 0:
            v.watch_count = (v.watch_count or 0) + 1
        v.watch_seconds = (v.watch_seconds or 0) + max(0, inp.seconds)
        v.last_position = max(0, inp.position)
        v.last_watched_at = datetime.now(timezone.utc)
        s.commit()
        return {"ok": True, "watch_count": v.watch_count, "watch_seconds": v.watch_seconds}


@app.post("/api/videos/{vid}/retry", dependencies=[Depends(auth)])
async def retry(vid: int, current_user: User = Depends(_user_required)):
    with Session(engine) as s:
        v = s.scalars(select(Video).where(Video.id == vid, Video.user_id == current_user.id)).first()
        if not v:
            raise HTTPException(404, "not found")
        v.status = "queued"
        v.error = ""
        s.commit()
    await _enqueue_id(vid)
    return {"ok": True}


@app.get("/api/queue")
def queue(current_user: User = Depends(_user_required)):
    with Session(engine) as s:
        stmt = (
            select(Video)
            .where(Video.status.in_(("queued", "downloading", "error")), Video.user_id == current_user.id)
            .order_by(Video.status.desc(), Video.created_at.desc())
        )
        return [_to_dict(r) for r in s.scalars(stmt)]


@app.get("/api/stats")
def stats(current_user: User = Depends(_user_required)):
    with Session(engine) as s:
        base = [Video.user_id == current_user.id]
        done = s.query(Video).filter(*base, Video.status == "done").count()
        queued = s.query(Video).filter(*base, Video.status == "queued").count()
        downloading = s.query(Video).filter(*base, Video.status == "downloading").count()
        errored = s.query(Video).filter(*base, Video.status == "error").count()
        fav = s.query(Video).filter(*base, Video.is_favorite == True).count()  # noqa: E712
        total_seconds = s.query(func.coalesce(func.sum(Video.watch_seconds), 0)).filter(*base).scalar() or 0
    return {
        "storage_dir": str(STORAGE),
        "disk_free_gb": round(disk_free_gb(), 2),
        "storage_used_gb": round(storage_used_gb(), 2),
        "max_total_gb": settings.max_total_gb,
        "min_free_gb": settings.min_free_gb,
        "counts": {
            "done": done, "queued": queued, "downloading": downloading,
            "errored": errored, "favorites": fav,
        },
        "watch_seconds_total": int(total_seconds),
    }


@app.get("/api/settings")
def get_settings():
    d = settings.model_dump()
    d.pop("api_token", None)
    return d


@app.put("/api/settings", dependencies=[Depends(auth)])
def put_settings(inp: SettingsIn):
    global _semaphore
    for k, v in inp.model_dump(exclude_none=True).items():
        setattr(settings, k, v)
    _semaphore = asyncio.Semaphore(settings.max_concurrent)
    return get_settings()


@app.post("/api/cleanup", dependencies=[Depends(auth)])
async def cleanup_now():
    return await _cleanup()


@app.delete("/api/videos/{vid}", dependencies=[Depends(auth)])
def delete_video(vid: int, current_user: User = Depends(_user_required)):
    with Session(engine) as s:
        v = s.scalars(select(Video).where(Video.id == vid, Video.user_id == current_user.id)).first()
        if not v:
            raise HTTPException(404, "not found")
        if v.filename:
            (STORAGE / v.filename).unlink(missing_ok=True)
        s.delete(v)
        s.commit()
    return {"ok": True}


@app.get("/media/{filename}")
def media(filename: str):
    p = (STORAGE / filename).resolve()
    if not str(p).startswith(str(STORAGE)) or not p.exists():
        raise HTTPException(404, "not found")
    return FileResponse(p)


@app.get("/api/cookies/status")
def cookies_status():
    browsers = ["chrome", "edge", "firefox", "brave", "opera"]
    status = {}
    for b in browsers:
        try:
            import subprocess
            r = subprocess.run(
                [sys.executable, "-m", "yt_dlp", "--cookies-from-browser", b,
                 "--skip-download", "--print", "title", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
                capture_output=True, text=True, timeout=10
            )
            status[b] = r.returncode == 0
        except Exception:
            status[b] = False
    return {
        "configured": settings.cookies_from_browser or _cookies_browser or "",
        "auto_detected": _cookies_browser,
        "browsers": status,
        "any_working": any(status.values()) or bool(_cookies_browser or settings.cookies_from_browser),
    }


COOKIES_FILE = STORAGE / "cookies.txt"


@app.post("/api/cookies/upload", dependencies=[Depends(auth)])
def upload_cookies(inp: CookiesIn):
    COOKIES_FILE.write_text(inp.cookies, encoding="utf-8")
    return {"ok": True, "path": str(COOKIES_FILE)}


@app.delete("/api/cookies/upload", dependencies=[Depends(auth)])
def clear_cookies():
    if COOKIES_FILE.exists():
        COOKIES_FILE.unlink()
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"ok": True, "version": "0.3.0"}


@app.get("/api/network")
def network_info():
    hostname = socket.gethostname()
    ips = []
    try:
        host = socket.gethostbyname_ex(hostname)[2]
        for ip in host:
            if ip.startswith("127.") or ip == "::1":
                continue
            ips.append(ip)
    except Exception:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        lan = s.getsockname()[0]
        if lan not in ips:
            ips.append(lan)
        s.close()
    except Exception:
        pass
    urls = [f"http://{ip}:{settings.port}" for ip in ips]
    urls.insert(0, f"http://localhost:{settings.port}")
    return {
        "hostname": hostname,
        "port": settings.port,
        "ips": ips,
        "urls": urls,
        "primary": urls[0] if urls else f"http://localhost:{settings.port}",
    }


# ---------- frontend ----------
if FRONTEND.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND), html=True), name="frontend")


scheduler = AsyncIOScheduler()


_zeroconf = None


@app.on_event("startup")
async def _startup():
    global _semaphore, _zeroconf, _cookies_browser
    _semaphore = asyncio.Semaphore(settings.max_concurrent)
    if not settings.cookies_from_browser:
        import subprocess
        for b in ["chrome", "edge", "firefox", "brave", "opera"]:
            try:
                r = subprocess.run(
                    [sys.executable, "-m", "yt_dlp", "--cookies-from-browser", b,
                     "--skip-download", "--print", "title", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
                    capture_output=True, text=True, timeout=15
                )
                if r.returncode == 0:
                    _cookies_browser = b
                    print(f"[NASTube] Cookies détectés depuis: {b}")
                    break
            except Exception:
                continue
    with Session(engine) as s:
        s.execute(update(Video).where(Video.status == "downloading").values(status="queued"))
        s.commit()
        for r in s.scalars(select(Video).where(Video.status == "queued")):
            await _enqueue_id(r.id)
    scheduler.add_job(_cleanup, "interval", hours=settings.clean_interval_hours, id="cleanup")
    scheduler.add_job(_cleanup_tokens, "interval", hours=1, id="cleanup_tokens")
    scheduler.start()
    try:
        from zeroconf import Zeroconf, ServiceInfo
        info = ServiceInfo(
            "_http._tcp.local.",
            f"NASTube._http._tcp.local.",
            addresses=[socket.inet_aton(ip) for ip in network_info()["ips"]],
            port=settings.port,
            properties={"path": "/"},
        )
        _zeroconf = Zeroconf()
        _zeroconf.register_service(info)
    except Exception:
        pass


@app.on_event("shutdown")
async def _shutdown():
    global _zeroconf
    scheduler.shutdown(wait=False)
    if _zeroconf:
        try: _zeroconf.unregister_all_services()
        except Exception: pass
        try: _zeroconf.close()
        except Exception: pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=settings.host, port=settings.port)
