"""
MoneyPrinter API
================
Production-grade REST + WebSocket API powering MoneyPrinterV2.

Key capabilities
----------------
- OAuth account link/unlink for YouTube and Twitter
- Background task execution (video generation, tweeting, affiliate campaigns)
- Real-time progress streaming via WebSocket  /ws/{task_id}
- Webhook push notifications on task state changes
- Recurring content schedules (1x / 2x / 3x per day)
- OpenAPI docs at /docs  ·  ReDoc at /redoc
"""

import os
import asyncio
import uuid
import json
import subprocess
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from functools import lru_cache
from typing import List, Optional

import schedule
import requests as http_requests
from dotenv import load_dotenv

from fastapi import (
    FastAPI, BackgroundTasks, Header,
    HTTPException, Depends, WebSocket, WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer

# Internal modules
from api_models import (
    # Accounts
    AccountResponse, YouTubeOAuthVerifyRequest, TwitterOAuthVerifyRequest,
    # Tasks
    YouTubeGenerateRequest, TwitterPostRequest, AFMCampaignRequest,
    TaskResponse,
    # Webhooks / Schedules
    WebhookSubscription, ScheduleRequest, ScheduleResponse,
    # Auth
    UserResponse,
    # Health
    HealthResponse,
)
from api_utils import (
    manager, get_tasks, get_task, update_task, delete_task_record,
    get_webhooks, add_webhook,
)
from cache import get_accounts, add_account, remove_account
from classes.YouTube import YouTube
from classes.Twitter import Twitter
from classes.AFM import AffiliateMarketing
from classes.Tts import TTS
from config import (
    assert_folder_structure,
    get_ollama_model,
    get_google_client_secrets_json,
    get_twitter_api_key,
    get_twitter_api_secret,
    ROOT_DIR,
)
from llm_provider import select_model
from database import init_db
from utils import rem_temp_files, fetch_songs

load_dotenv()

# ── OpenAPI tag metadata (drives /docs sidebar) ────────────────────────────────

TAGS_METADATA = [
    {
        "name": "General",
        "description": "Root, health check, and API info endpoints.",
    },
    {
        "name": "Auth",
        "description": "Supabase JWT-authenticated user identity endpoints.",
    },
    {
        "name": "Accounts",
        "description": (
            "Link and manage YouTube and Twitter accounts via OAuth. "
            "Accounts are stored locally in `.mp/youtube.json` / `.mp/twitter.json`."
        ),
    },
    {
        "name": "Tasks",
        "description": (
            "Trigger background automation tasks (YouTube Shorts generation, "
            "Twitter posting, affiliate campaigns). All tasks are non-blocking — "
            "the server returns a `task_id` instantly. Track progress via "
            "`GET /tasks/{task_id}` polling **or** the WebSocket endpoint `ws://.../ws/{task_id}`."
        ),
    },
    {
        "name": "WebSocket",
        "description": (
            "Real-time task progress stream. Connect to `ws://<host>/ws/{task_id}` "
            "immediately after creating a task. The server pushes a JSON message every "
            "time the task status changes."
        ),
    },
    {
        "name": "Webhooks",
        "description": (
            "Register an HTTP endpoint to receive POST notifications on task events "
            "(`task.queued`, `task.running`, `task.completed`, `task.failed`)."
        ),
    },
    {
        "name": "Schedules",
        "description": "Create and list recurring automation schedules (daily/twice-daily/thrice-daily).",
    },
]

# ── Environment ────────────────────────────────────────────────────────────────

FRONTEND_URL = (os.getenv("FRONTEND_URL", "http://localhost:5173") or "http://localhost:5173").rstrip("/")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
API_KEY = os.getenv("MP_API_KEY", "default_secret_key")

SCHEDULES_FILE = os.path.join(ROOT_DIR, ".mp", "schedules.json")

# ── Schedule helpers ───────────────────────────────────────────────────────────

def load_schedules() -> list:
    if os.path.exists(SCHEDULES_FILE):
        try:
            with open(SCHEDULES_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_schedules(schedules: list) -> None:
    os.makedirs(os.path.dirname(SCHEDULES_FILE), exist_ok=True)
    with open(SCHEDULES_FILE, "w") as f:
        json.dump(schedules, f, indent=4)


def run_scheduled_job(provider: str, account_id: str) -> None:
    model = get_ollama_model()
    cron_script_path = os.path.join(ROOT_DIR, "src", "cron.py")
    subprocess.run(["python", cron_script_path, provider, account_id, model])


def apply_schedules() -> None:
    schedule.clear()
    for s in load_schedules():
        def _wrap(p=s["provider"], a=s["account_id"]):
            run_scheduled_job(p, a)

        freq = s["frequency"]
        if freq == "once_a_day":
            schedule.every().day.at(s.get("time", "10:00")).do(_wrap)
        elif freq == "twice_a_day":
            schedule.every().day.at("10:00").do(_wrap)
            schedule.every().day.at("16:00").do(_wrap)
        elif freq == "thrice_a_day":
            schedule.every().day.at("08:00").do(_wrap)
            schedule.every().day.at("12:00").do(_wrap)
            schedule.every().day.at("18:00").do(_wrap)


async def scheduler_loop() -> None:
    while True:
        schedule.run_pending()
        await asyncio.sleep(60)


# ── Lifespan (startup / shutdown) ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start services when the server boots, clean up on shutdown."""
    init_db()
    assert_folder_structure()
    rem_temp_files()

    # Fetch background music in a daemon thread (non-blocking)
    threading.Thread(target=fetch_songs, daemon=True).start()

    # Prime the default LLM model (if configured)
    model = get_ollama_model()
    if model:
        select_model(model)

    # Launch the recurring schedule runner
    apply_schedules()
    asyncio.create_task(scheduler_loop())

    yield  # ← server is live


# ── App factory ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="MoneyPrinter API",
    version="1.0.0",
    description=__doc__,
    openapi_tags=TAGS_METADATA,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    license_info={"name": "MIT"},
    contact={
        "name": "MoneyPrinterV2",
        "url": "https://github.com/Ogak-AI/MoneyPrinterV2",
    },
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Auth uses Bearer tokens in the Authorization header — NOT cookies.
# Therefore allow_credentials=True is not required, and we can safely use
# allow_origins=["*"] so that OPTIONS preflights always pass regardless of
# which Vercel preview URL or custom domain the frontend is served from.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Bearer token ───────────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


# ── Supabase JWT validation ────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _fetch_supabase_jwks() -> list:
    """Fetch and LRU-cache Supabase's JWKS public keys (RS256/ES256 support)."""
    if not SUPABASE_URL:
        print("WARNING: SUPABASE_URL not set — cannot fetch JWKS.")
        return []
    try:
        resp = http_requests.get(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json", timeout=10)
        resp.raise_for_status()
        return resp.json().get("keys", [])
    except Exception as e:
        print(f"Failed to fetch Supabase JWKS: {e}")
        return []


def _decode_supabase_token(token: str) -> Optional[dict]:
    """
    Decode a Supabase JWT.
    Supports RS256/ES256 (JWKS) and HS256 (shared secret) automatically.
    """
    import jwt  # PyJWT

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
    except Exception as e:
        print(f"JWT header parse error: {e}")
        return None

    if alg in ("RS256", "ES256"):
        keys = _fetch_supabase_jwks()
        if not keys:
            print(f"No JWKS keys available for {alg} validation.")
            return None
        kid = header.get("kid")
        candidates = [k for k in keys if k.get("kid") == kid] if kid else keys
        for jwk in (candidates or keys):
            try:
                if alg == "RS256":
                    from jwt.algorithms import RSAAlgorithm
                    pub = RSAAlgorithm.from_jwk(json.dumps(jwk))
                else:
                    from jwt.algorithms import ECAlgorithm
                    pub = ECAlgorithm.from_jwk(json.dumps(jwk))
                return jwt.decode(token, pub, algorithms=[alg], audience="authenticated")
            except Exception as e:
                print(f"JWT validation error ({alg}, kid={jwk.get('kid')}): {e}")
        return None

    # HS256 / HS512 symmetric
    if not SUPABASE_JWT_SECRET:
        print("WARNING: SUPABASE_JWT_SECRET not set.")
        return None
    try:
        return jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=[alg, "HS256"], audience="authenticated")
    except Exception as e:
        print(f"JWT validation error (alg={alg}): {e}")
        return None


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = _decode_supabase_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"id": payload.get("sub"), "email": payload.get("email")}


# ═══════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

# ── General ────────────────────────────────────────────────────────────────────

@app.head("/", include_in_schema=False)
@app.get(
    "/",
    tags=["General"],
    summary="API root",
    description="Returns a basic liveness message and a link to the interactive docs.",
)
def read_root():
    return {
        "name": "MoneyPrinter API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.head("/health", include_in_schema=False)
@app.get(
    "/health",
    tags=["General"],
    summary="Detailed health check",
    response_model=HealthResponse,
    description=(
        "Returns server health along with live metrics: registered account counts, "
        "pending task count, and number of active schedules. "
        "Suitable for Render / Railway health probes."
    ),
)
def health_check():
    tasks = get_tasks()
    pending = sum(1 for t in tasks.values() if t.get("status") in ("queued", "running"))
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        accounts={
            "youtube": len(get_accounts("youtube")),
            "twitter": len(get_accounts("twitter")),
        },
        pending_tasks=pending,
        schedules=len(load_schedules()),
    )


# ── Auth ───────────────────────────────────────────────────────────────────────

@app.get(
    "/api/auth/me",
    tags=["Auth"],
    summary="Get current authenticated user",
    response_model=UserResponse,
    description="Decodes the Supabase Bearer token and returns the user's `id` and `email`.",
)
def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(id=current_user["id"], email=current_user["email"])


# ── Accounts ───────────────────────────────────────────────────────────────────

@app.get(
    "/accounts",
    tags=["Accounts"],
    summary="List all linked accounts",
    response_model=List[AccountResponse],
    description="Returns every linked YouTube and Twitter account for the current server instance.",
    dependencies=[Depends(get_current_user)],
)
def list_accounts():
    accounts = []
    for provider in ("youtube", "twitter"):
        for acc in get_accounts(provider):
            accounts.append(AccountResponse(
                id=acc["id"],
                nickname=acc["nickname"],
                provider=provider,
                niche=acc.get("niche"),
                topic=acc.get("topic"),
                language=acc.get("language"),
            ))
    return accounts


@app.get(
    "/accounts/{provider}",
    tags=["Accounts"],
    summary="List accounts by provider",
    response_model=List[AccountResponse],
    description="Filter accounts by provider. Valid values: `youtube`, `twitter`.",
    dependencies=[Depends(get_current_user)],
)
def list_provider_accounts(provider: str):
    if provider not in ("youtube", "twitter"):
        raise HTTPException(status_code=400, detail="Invalid provider. Use 'youtube' or 'twitter'.")
    return [
        AccountResponse(
            id=acc["id"],
            nickname=acc["nickname"],
            provider=provider,
            niche=acc.get("niche"),
            topic=acc.get("topic"),
            language=acc.get("language"),
        )
        for acc in get_accounts(provider)
    ]


@app.post(
    "/accounts/youtube/init",
    tags=["Accounts"],
    summary="Begin YouTube OAuth flow",
    description=(
        "Generates a Google OAuth authorization URL. Redirect the user to `auth_url`. "
        "After consent, Google redirects to `/oauth-callback?code=...` on your frontend. "
        "Then call `POST /accounts/youtube/verify` with the code."
    ),
    dependencies=[Depends(get_current_user)],
)
def youtube_init_oauth():
    try:
        from google_auth_oauthlib.flow import Flow
        client_secrets_json = get_google_client_secrets_json()
        if not client_secrets_json:
            raise HTTPException(status_code=500, detail="Server is missing Google Client Secrets. Set GOOGLE_CLIENT_SECRETS_JSON.")
        flow = Flow.from_client_config(
            json.loads(client_secrets_json),
            scopes=["https://www.googleapis.com/auth/youtube.upload"],
        )
        flow.redirect_uri = f"{FRONTEND_URL}/oauth-callback"
        auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")
        return {"auth_url": auth_url, "code_verifier": getattr(flow, "code_verifier", None)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate Auth URL: {e}")


@app.post(
    "/accounts/youtube/verify",
    tags=["Accounts"],
    summary="Complete YouTube OAuth flow",
    description=(
        "Exchange the Google OAuth `auth_code` for credentials and store the linked account. "
        "Pass the `code_verifier` if it was returned by `/accounts/youtube/init`."
    ),
    dependencies=[Depends(get_current_user)],
)
def youtube_verify_oauth(req: YouTubeOAuthVerifyRequest):
    try:
        from google_auth_oauthlib.flow import Flow
        client_secrets_json = get_google_client_secrets_json()
        if not client_secrets_json:
            raise HTTPException(status_code=500, detail="Server is missing Google Client Secrets.")
        flow = Flow.from_client_config(
            json.loads(client_secrets_json),
            scopes=["https://www.googleapis.com/auth/youtube.upload"],
        )
        flow.redirect_uri = f"{FRONTEND_URL}/oauth-callback"
        if req.code_verifier:
            flow.code_verifier = req.code_verifier
        flow.fetch_token(code=req.auth_code)

        creds = flow.credentials
        account_id = str(uuid.uuid4())
        add_account("youtube", {
            "id": account_id,
            "nickname": req.nickname,
            "credentials": {
                "token": creds.token,
                "refresh_token": creds.refresh_token,
                "token_uri": creds.token_uri,
                "client_id": creds.client_id,
                "client_secret": creds.client_secret,
                "scopes": list(creds.scopes) if creds.scopes else [],
            },
            "niche": req.niche,
            "language": req.language,
            "videos": [],
        })
        return {"id": account_id, "message": "YouTube account linked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth verification failed: {e}")


@app.post(
    "/accounts/twitter/init",
    tags=["Accounts"],
    summary="Begin Twitter OAuth flow",
    description=(
        "Generates a Twitter OAuth 1.0a authorization URL. Redirect the user to `auth_url`. "
        "After the user authorizes and receives a PIN, call `POST /accounts/twitter/verify`."
    ),
    dependencies=[Depends(get_current_user)],
)
def twitter_init_oauth():
    try:
        import tweepy
        api_key = get_twitter_api_key()
        api_secret = get_twitter_api_secret()
        if not api_key or not api_secret:
            raise HTTPException(status_code=500, detail="Server is missing Twitter Developer Keys. Set TWITTER_API_KEY and TWITTER_API_SECRET.")
        handler = tweepy.OAuth1UserHandler(api_key, api_secret, callback="oob")
        auth_url = handler.get_authorization_url()
        return {
            "auth_url": auth_url,
            "oauth_token": handler.request_token["oauth_token"],
            "oauth_token_secret": handler.request_token["oauth_token_secret"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to start Twitter OAuth: {e}")


@app.post(
    "/accounts/twitter/verify",
    tags=["Accounts"],
    summary="Complete Twitter OAuth flow",
    description="Exchange the Twitter OAuth PIN for access tokens and store the linked account.",
    dependencies=[Depends(get_current_user)],
)
def twitter_verify_oauth(req: TwitterOAuthVerifyRequest):
    try:
        import tweepy
        handler = tweepy.OAuth1UserHandler(get_twitter_api_key(), get_twitter_api_secret())
        handler.request_token = {
            "oauth_token": req.oauth_token,
            "oauth_token_secret": req.oauth_token_secret,
        }
        access_token, access_token_secret = handler.get_access_token(req.pin)
        account_id = str(uuid.uuid4())
        add_account("twitter", {
            "id": account_id,
            "nickname": req.nickname,
            "access_token": access_token,
            "access_token_secret": access_token_secret,
            "topic": req.topic,
            "tweets": [],
        })
        return {"id": account_id, "message": "Twitter account linked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Twitter OAuth verification failed: {e}")


@app.delete(
    "/accounts/{provider}/{account_id}",
    tags=["Accounts"],
    summary="Unlink an account",
    description="Removes the account from local storage. Credentials are deleted and cannot be recovered.",
    dependencies=[Depends(get_current_user)],
)
def delete_provider_account(provider: str, account_id: str):
    if provider not in ("youtube", "twitter"):
        raise HTTPException(status_code=400, detail="Invalid provider.")
    remove_account(provider, account_id)
    return {"message": f"{provider.capitalize()} account {account_id} removed"}


# ── Background task runners ────────────────────────────────────────────────────

async def run_youtube_task(task_id: str, req: YouTubeGenerateRequest) -> None:
    """
    Multi-step YouTube Shorts pipeline with granular progress updates:
      1. Lookup account
      2. Initialise YouTube class
      3. Generate video  (LLM script → TTS → image generation → MoviePy render)
      4. (optional) Upload to YouTube
    """
    try:
        # Step 1 — resolve account
        update_task(task_id, "running", "🔍 Resolving account...", webhook_url=req.webhook_url)
        account = next((a for a in get_accounts("youtube") if a["id"] == req.account_id), None)
        if not account:
            update_task(task_id, "failed", f"Account '{req.account_id}' not found")
            return

        # Step 2 — initialise YouTube class (may do API calls)
        update_task(task_id, "running", "🔗 Connecting to YouTube API...")
        yt = await asyncio.to_thread(
            YouTube,
            account_uuid=account["id"],
            account_nickname=account["nickname"],
            credentials=account["credentials"],
            niche=req.niche or account.get("niche"),
            language=req.language or account.get("language"),
        )

        # Step 3 — generate video  
        update_task(task_id, "running", "🎬 Generating script with LLM...")
        tts = TTS()
        update_task(task_id, "running", "🎙️ Synthesizing voice narration...")
        video_path = await asyncio.to_thread(yt.generate_video, tts)
        result = {"video_path": video_path}

        # Step 4 — optional upload
        if req.upload:
            update_task(task_id, "running", "📤 Uploading to YouTube...")
            uploaded = await asyncio.to_thread(yt.upload_video)
            result["uploaded"] = uploaded

        update_task(task_id, "completed", "✅ YouTube Short generated successfully", result)

    except Exception as e:
        update_task(task_id, "failed", f"❌ Task failed: {e}")


async def run_twitter_task(task_id: str, req: TwitterPostRequest) -> None:
    """
    Twitter posting pipeline:
      1. Lookup account
      2. (optional) LLM-generate tweet text
      3. Post via Tweepy v2
    """
    try:
        update_task(task_id, "running", "🔍 Resolving Twitter account...", webhook_url=req.webhook_url)
        account = next((a for a in get_accounts("twitter") if a["id"] == req.account_id), None)
        if not account:
            update_task(task_id, "failed", f"Account '{req.account_id}' not found")
            return

        tw = Twitter(
            account_uuid=account["id"],
            account_nickname=account["nickname"],
            api_key=get_twitter_api_key(),
            api_secret=get_twitter_api_secret(),
            access_token=account.get("access_token"),
            access_token_secret=account.get("access_token_secret"),
            topic=account["topic"],
        )

        if req.text:
            update_task(task_id, "running", "📝 Preparing tweet...")
        else:
            update_task(task_id, "running", "🤖 Generating tweet with LLM...")

        await asyncio.to_thread(tw.post, text=req.text)
        update_task(task_id, "completed", "✅ Tweet posted successfully")

    except Exception as e:
        update_task(task_id, "failed", f"❌ Task failed: {e}")


async def run_afm_task(task_id: str, req: AFMCampaignRequest) -> None:
    """
    Affiliate Marketing campaign pipeline:
      1. Lookup Twitter account
      2. Scrape product info from affiliate URL
      3. LLM-generate pitch
      4. Post pitch to Twitter
    """
    try:
        update_task(task_id, "running", "🔍 Resolving Twitter account...", webhook_url=req.webhook_url)
        account = next((a for a in get_accounts("twitter") if a["id"] == req.twitter_account_id), None)
        if not account:
            update_task(task_id, "failed", f"Twitter account '{req.twitter_account_id}' not found")
            return

        update_task(task_id, "running", "🌐 Scraping product information...")
        afm = await asyncio.to_thread(
            AffiliateMarketing,
            req.affiliate_link,
            account["id"],
            account["nickname"],
            account["topic"],
            api_key=get_twitter_api_key(),
            api_secret=get_twitter_api_secret(),
            access_token=account.get("access_token"),
            access_token_secret=account.get("access_token_secret"),
        )

        update_task(task_id, "running", "🤖 Generating affiliate pitch with LLM...")
        await asyncio.to_thread(afm.generate_pitch)

        update_task(task_id, "running", "📤 Posting pitch to Twitter...")
        await asyncio.to_thread(afm.share_pitch, "twitter")

        update_task(task_id, "completed", "✅ Affiliate campaign posted successfully")

    except Exception as e:
        update_task(task_id, "failed", f"❌ Task failed: {e}")


# ── Task endpoints ─────────────────────────────────────────────────────────────

@app.post(
    "/tasks/youtube/generate",
    tags=["Tasks"],
    summary="Generate (and optionally upload) a YouTube Short",
    response_model=TaskResponse,
    status_code=202,
    description=(
        "Enqueues a background task that runs the full YouTube Shorts pipeline: "
        "LLM script generation → TTS voice synthesis → image generation → MP4 render. "
        "Set `upload: true` to automatically publish the video.\n\n"
        "**Returns immediately** with a `task_id`. Track progress via:\n"
        "- `GET /tasks/{task_id}` — polling\n"
        "- `WebSocket /ws/{task_id}` — real-time push"
    ),
    dependencies=[Depends(get_current_user)],
)
def generate_youtube_video(req: YouTubeGenerateRequest, bg: BackgroundTasks):
    task_id = str(uuid.uuid4())
    update_task(task_id, "queued", "Task queued — waiting for worker...", webhook_url=req.webhook_url, provider="youtube")
    bg.add_task(run_youtube_task, task_id, req)
    return TaskResponse(task_id=task_id, status="queued", message="Task accepted — generation starting in background")


@app.post(
    "/tasks/twitter/post",
    tags=["Tasks"],
    summary="Post a tweet (or generate one with AI)",
    response_model=TaskResponse,
    status_code=202,
    description=(
        "Posts to Twitter using the linked account's API credentials. "
        "If `text` is omitted, the LLM generates a tweet based on the account's configured topic.\n\n"
        "**Returns immediately** with a `task_id`."
    ),
    dependencies=[Depends(get_current_user)],
)
def post_to_twitter(req: TwitterPostRequest, bg: BackgroundTasks):
    task_id = str(uuid.uuid4())
    update_task(task_id, "queued", "Task queued — waiting for worker...", webhook_url=req.webhook_url, provider="twitter")
    bg.add_task(run_twitter_task, task_id, req)
    return TaskResponse(task_id=task_id, status="queued", message="Task accepted — tweet posting in background")


@app.post(
    "/tasks/afm/run",
    tags=["Tasks"],
    summary="Run an affiliate marketing campaign",
    response_model=TaskResponse,
    status_code=202,
    description=(
        "Scrapes the affiliate product page, generates a compelling pitch with the LLM, "
        "and posts it to the linked Twitter account.\n\n"
        "**Returns immediately** with a `task_id`."
    ),
    dependencies=[Depends(get_current_user)],
)
def run_afm_campaign(req: AFMCampaignRequest, bg: BackgroundTasks):
    task_id = str(uuid.uuid4())
    update_task(task_id, "queued", "Task queued — waiting for worker...", webhook_url=req.webhook_url, provider="afm")
    bg.add_task(run_afm_task, task_id, req)
    return TaskResponse(task_id=task_id, status="queued", message="Task accepted — campaign starting in background")


@app.get(
    "/tasks",
    tags=["Tasks"],
    summary="List all tasks",
    response_model=List[TaskResponse],
    description="Returns all tasks ever created in this server session, newest first.",
    dependencies=[Depends(get_current_user)],
)
def list_tasks():
    tasks_dict = get_tasks()
    return [
        TaskResponse(task_id=tid, **tdata)
        for tid, tdata in reversed(list(tasks_dict.items()))
    ]


@app.get(
    "/tasks/{task_id}",
    tags=["Tasks"],
    summary="Get task status",
    response_model=TaskResponse,
    description=(
        "Poll the current state of a background task. "
        "For real-time updates without polling, connect to `WebSocket /ws/{task_id}`."
    ),
    dependencies=[Depends(get_current_user)],
)
def get_task_status(task_id: str):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    return TaskResponse(task_id=task_id, **task)


@app.delete(
    "/tasks/{task_id}",
    tags=["Tasks"],
    summary="Delete a task record",
    description=(
        "Removes a task from the task store. "
        "This does **not** cancel a running task — it only removes the stored status record."
    ),
    dependencies=[Depends(get_current_user)],
)
def delete_task(task_id: str):
    deleted = delete_task_record(task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    return {"message": f"Task {task_id} deleted"}


# ── WebSocket ──────────────────────────────────────────────────────────────────

@app.websocket("/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    """
    **Real-time task progress stream.**

    Connect immediately after creating a task. The server:
    1. Sends the current task state on connect
    2. Pushes a JSON message every time the status changes
    3. Keeps the connection open until the client disconnects

    Message schema:
    ```json
    {
      "task_id": "...",
      "status": "running | completed | failed",
      "message": "Human-readable progress step",
      "result": { ... }
    }
    ```
    """
    await manager.connect(websocket, task_id)
    try:
        task = get_task(task_id)
        if task:
            await websocket.send_json({"task_id": task_id, **task})
        else:
            await websocket.send_json({"task_id": task_id, "status": "not_found", "message": "Task not found"})
        while True:
            await websocket.receive_text()  # keep alive — client can send pings
    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)
    except Exception:
        manager.disconnect(websocket, task_id)


# ── Webhooks ───────────────────────────────────────────────────────────────────

@app.get(
    "/webhooks",
    tags=["Webhooks"],
    summary="List webhook subscriptions",
    description="Returns all registered webhook endpoints.",
    dependencies=[Depends(get_current_user)],
)
def list_webhooks():
    return get_webhooks()


@app.post(
    "/webhooks/subscribe",
    tags=["Webhooks"],
    summary="Register a webhook",
    description=(
        "Subscribe an HTTP endpoint to receive task lifecycle events. "
        "The server sends a POST request to your URL with the following payload:\n\n"
        "```json\n"
        "{\n"
        "  \"event\": \"task.completed\",\n"
        "  \"timestamp\": \"2024-01-01T12:00:00Z\",\n"
        "  \"data\": { \"task_id\": \"...\", \"status\": \"completed\", ... }\n"
        "}\n"
        "```\n\n"
        "Set `events: [\"*\"]` to receive all events."
    ),
    dependencies=[Depends(get_current_user)],
)
def subscribe_to_webhooks(sub: WebhookSubscription):
    add_webhook(sub.model_dump())
    return {"message": "Webhook registered successfully", "url": sub.url, "events": sub.events}


# ── Schedules ──────────────────────────────────────────────────────────────────

@app.get(
    "/schedules",
    tags=["Schedules"],
    summary="List active schedules",
    response_model=List[ScheduleResponse],
    description="Returns all saved recurring automation schedules.",
    dependencies=[Depends(get_current_user)],
)
def list_schedules():
    return [ScheduleResponse(**s) for s in load_schedules()]


@app.post(
    "/schedules",
    tags=["Schedules"],
    summary="Create a recurring schedule",
    description=(
        "Schedule a provider account to auto-post on a recurring basis. "
        "The scheduler runs every 60 seconds and fires jobs at the configured times.\n\n"
        "| frequency | posts per day | times |\n"
        "|---|---|---|\n"
        "| `once_a_day` | 1 | `time` param (default 10:00) |\n"
        "| `twice_a_day` | 2 | 10:00 and 16:00 |\n"
        "| `thrice_a_day` | 3 | 08:00, 12:00, 18:00 |"
    ),
    dependencies=[Depends(get_current_user)],
)
def add_recurring_schedule(req: ScheduleRequest):
    schedules = load_schedules()
    schedules.append(req.model_dump())
    save_schedules(schedules)
    apply_schedules()
    return {"message": "Schedule created successfully", **req.model_dump()}


@app.delete(
    "/schedules/{index}",
    tags=["Schedules"],
    summary="Delete a schedule by index",
    description="Removes the schedule at the given list index (0-based). Reload `/schedules` to get current indices.",
    dependencies=[Depends(get_current_user)],
)
def delete_schedule(index: int):
    schedules = load_schedules()
    if index < 0 or index >= len(schedules):
        raise HTTPException(status_code=404, detail=f"Schedule index {index} out of range (total: {len(schedules)})")
    removed = schedules.pop(index)
    save_schedules(schedules)
    apply_schedules()
    return {"message": "Schedule deleted", "deleted": removed}


# ── Entrypoint ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=False)
