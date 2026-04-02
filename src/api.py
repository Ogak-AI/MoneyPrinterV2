import os
import json
import uuid
import asyncio
import schedule
import subprocess
import requests as http_requests
from functools import lru_cache
from fastapi import FastAPI, BackgroundTasks, Header, HTTPException, Depends, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
from api_models import *
from api_utils import *
from cache import get_accounts, add_account, remove_account, get_products, add_product
from classes.YouTube import YouTube
from classes.Twitter import Twitter
from classes.AFM import AffiliateMarketing
from classes.Tts import TTS
from utils import rem_temp_files, fetch_songs
from config import (
    assert_folder_structure,
    get_ollama_model,
    get_google_client_secrets_json,
    get_twitter_api_key,
    get_twitter_api_secret,
    ROOT_DIR,
)
from llm_provider import select_model
from database import init_db, get_db_connection
from auth_utils import get_password_hash, verify_password, create_access_token, decode_access_token, generate_secure_token
from email_utils import send_password_reset_email

import json
from datetime import datetime, timedelta

app = FastAPI(
    title="MoneyPrinterV2 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Ensure DB is initialized immediately on load
init_db()

# Use environment variable for frontend URL, with fallbacks for development and your specific Vercel URL
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://moneyprinterv2-ahg9t61yn-ogak-ais-projects.vercel.app",
        FRONTEND_URL,
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Persistence for recurring schedules
SCHEDULES_FILE = os.path.join(ROOT_DIR, ".mp", "schedules.json")

def load_schedules():
    if os.path.exists(SCHEDULES_FILE):
        try:
            with open(SCHEDULES_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_schedules(schedules):
    os.makedirs(os.path.dirname(SCHEDULES_FILE), exist_ok=True)
    with open(SCHEDULES_FILE, "w") as f:
        json.dump(schedules, f, indent=4)

def run_scheduled_job(provider, account_id):
    model = get_ollama_model()
    cron_script_path = os.path.join(ROOT_DIR, "src", "cron.py")
    subprocess.run(["python", cron_script_path, provider, account_id, model])

def apply_schedules():
    schedule.clear()
    schedules = load_schedules()
    for s in schedules:
        # Wrap job in a function that provides the arguments correctly
        def job_wrapper(p=s['provider'], a=s['account_id']):
            run_scheduled_job(p, a)
        
        freq = s['frequency']
        if freq == "once_a_day":
            schedule.every().day.at(s.get('time', "10:00")).do(job_wrapper)
        elif freq == "twice_a_day":
            schedule.every().day.at("10:00").do(job_wrapper)
            schedule.every().day.at("16:00").do(job_wrapper)
        elif freq == "thrice_a_day":
            schedule.every().day.at("08:00").do(job_wrapper)
            schedule.every().day.at("12:00").do(job_wrapper)
            schedule.every().day.at("18:00").do(job_wrapper)

async def scheduler_loop():
    while True:
        schedule.run_pending()
        await asyncio.sleep(60)

# Simple API Key authentication
API_KEY = os.getenv("MP_API_KEY", "default_secret_key")

def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return x_api_key

@app.on_event("startup")
async def startup_event():
    init_db()
    assert_folder_structure()
    rem_temp_files()
    fetch_songs()
    # Select default model if configured
    model = get_ollama_model()
    if model:
        select_model(model)
    
    # Start scheduler
    apply_schedules()
    asyncio.create_task(scheduler_loop())

@app.get("/")
def read_root():
    return {"message": "MoneyPrinterV2 API is running", "docs": "/docs"}

# Supabase configuration for token validation
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")

@lru_cache(maxsize=1)
def _fetch_supabase_jwks() -> list:
    """
    Fetch and cache Supabase's RSA public keys from the JWKS endpoint.
    Only called when the token algorithm is RS256.
    """
    if not SUPABASE_URL:
        print("WARNING: SUPABASE_URL not set — cannot fetch JWKS for RS256 validation.")
        return []
    try:
        resp = http_requests.get(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json", timeout=10)
        resp.raise_for_status()
        return resp.json().get("keys", [])
    except Exception as e:
        print(f"Failed to fetch Supabase JWKS: {e}")
        return []

def _decode_supabase_token(token: str):
    """
    Decode a Supabase-issued JWT.
    Supports both RS256 (new Supabase projects) and HS256 (legacy projects).
    Algorithm is detected from the token header automatically.
    """
    import jwt

    # Peek at the JWT header to determine algorithm
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
    except Exception as e:
        print(f"Token header parse error: {e}")
        return None

    if alg in ["RS256", "ES256"]:
        # Validate using Supabase's public key via JWKS
        keys = _fetch_supabase_jwks()
        if not keys:
            print(f"Token validation error: {alg} token received but no JWKS keys available.")
            return None
        kid = header.get("kid")
        # Match by key ID if present, otherwise try all signing keys
        candidates = [k for k in keys if k.get("kid") == kid] if kid else keys
        if not candidates:
            candidates = keys
        for jwk in candidates:
            try:
                if alg == "RS256":
                    from jwt.algorithms import RSAAlgorithm
                    public_key = RSAAlgorithm.from_jwk(json.dumps(jwk))
                elif alg == "ES256":
                    from jwt.algorithms import ECAlgorithm
                    public_key = ECAlgorithm.from_jwk(json.dumps(jwk))

                return jwt.decode(
                    token,
                    public_key,
                    algorithms=[alg],
                    audience="authenticated",
                )
            except Exception as e:
                print(f"Token validation error ({alg}, kid={jwk.get('kid')}): {e}")
        return None
    else:
        # Fallback to symmetric validation with JWT secret
        if not SUPABASE_JWT_SECRET:
            print("WARNING: SUPABASE_JWT_SECRET not set — validation will fail.")
            return None
        try:
            return jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=[alg, "HS256"],
                audience="authenticated",
            )
        except Exception as e:
            print(f"Token validation error (alg={alg}): {e} | Header: {header}")
            return None

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = _decode_supabase_token(token)

    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Supabase JWT payload has 'sub' as user id
    return {"id": payload.get("sub"), "email": payload.get("email")}

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "email": current_user["email"]}



@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/accounts", response_model=List[AccountResponse], dependencies=[Depends(get_current_user)])
def list_accounts():
    accounts = []
    for provider in ["youtube", "twitter"]:
        for acc in get_accounts(provider):
            accounts.append(AccountResponse(
                id=acc["id"],
                nickname=acc["nickname"],
                provider=provider,
                niche=acc.get("niche"),
                topic=acc.get("topic"),
                language=acc.get("language")
            ))
    return accounts

@app.get("/accounts/{provider}", response_model=List[AccountResponse], dependencies=[Depends(get_current_user)])
def list_provider_accounts(provider: str):
    if provider not in ["youtube", "twitter"]:
        raise HTTPException(status_code=400, detail="Invalid provider")
    accounts = get_accounts(provider)
    return [AccountResponse(
        id=acc["id"],
        nickname=acc["nickname"],
        provider=provider,
        niche=acc.get("niche"),
        topic=acc.get("topic"),
        language=acc.get("language")
    ) for acc in accounts]

@app.post("/accounts/youtube/init", dependencies=[Depends(get_current_user)])
def youtube_init_oauth():
    try:
        from google_auth_oauthlib.flow import Flow
        client_secrets_json = get_google_client_secrets_json()
        if not client_secrets_json:
            raise HTTPException(status_code=500, detail="Server missing Google Client Secrets.")
        client_config = json.loads(client_secrets_json)
        flow = Flow.from_client_config(
            client_config,
            scopes=["https://www.googleapis.com/auth/youtube.upload"]
        )
        flow.redirect_uri = f"{FRONTEND_URL}/oauth-callback"
        auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate Auth URL: {str(e)}")

@app.post("/accounts/youtube/verify", dependencies=[Depends(get_current_user)])
def youtube_verify_oauth(req: YouTubeOAuthVerifyRequest):
    try:
        from google_auth_oauthlib.flow import Flow
        client_secrets_json = get_google_client_secrets_json()
        if not client_secrets_json:
            raise HTTPException(status_code=500, detail="Server missing Google Client Secrets.")
        client_config = json.loads(client_secrets_json)
        flow = Flow.from_client_config(
            client_config,
            scopes=["https://www.googleapis.com/auth/youtube.upload"]
        )
        flow.redirect_uri = f"{FRONTEND_URL}/oauth-callback"
        flow.fetch_token(code=req.auth_code)
        
        credentials = flow.credentials
        creds_data = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }

        account_id = str(uuid.uuid4())
        add_account("youtube", {
            "id": account_id,
            "nickname": req.nickname,
            "credentials": creds_data,
            "niche": req.niche,
            "language": req.language,
            "videos": []
        })
        return {"id": account_id, "message": "YouTube Account registered and authorized"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth verification failed: {str(e)}")

@app.post("/accounts/twitter/init", dependencies=[Depends(get_current_user)])
def twitter_init_oauth():
    try:
        import tweepy
        api_key = get_twitter_api_key()
        api_secret = get_twitter_api_secret()
        if not api_key or not api_secret:
            raise HTTPException(status_code=500, detail="Server missing Twitter Developer Keys.")
        
        handler = tweepy.OAuth1UserHandler(api_key, api_secret, callback='oob')
        auth_url = handler.get_authorization_url()
        return {
            "auth_url": auth_url,
            "oauth_token": handler.request_token["oauth_token"],
            "oauth_token_secret": handler.request_token["oauth_token_secret"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate Twitter Auth URL: {str(e)}")

@app.post("/accounts/twitter/verify", dependencies=[Depends(get_current_user)])
def twitter_verify_oauth(req: TwitterOAuthVerifyRequest):
    try:
        import tweepy
        api_key = get_twitter_api_key()
        api_secret = get_twitter_api_secret()
        
        handler = tweepy.OAuth1UserHandler(api_key, api_secret)
        handler.request_token = {
            "oauth_token": req.oauth_token,
            "oauth_token_secret": req.oauth_token_secret
        }
        
        access_token, access_token_secret = handler.get_access_token(req.pin)
        
        account_id = str(uuid.uuid4())
        add_account("twitter", {
            "id": account_id,
            "nickname": req.nickname,
            "access_token": access_token,
            "access_token_secret": access_token_secret,
            "topic": req.topic,
            "tweets": []
        })
        return {"id": account_id, "message": "Twitter Account registered successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Twitter Auth verification failed: {str(e)}")

@app.delete("/accounts/{provider}/{account_id}", dependencies=[Depends(get_current_user)])
def delete_provider_account(provider: str, account_id: str):
    remove_account(provider, account_id)
    return {"message": "Account removed"}

# Background Task Runners
async def run_youtube_task(task_id: str, req: YouTubeGenerateRequest):
    try:
        update_task(task_id, "running", "Initializing YouTube automation...", webhook_url=req.webhook_url)
        accounts = get_accounts("youtube")
        account = next((a for a in accounts if a["id"] == req.account_id), None)
        if not account:
            update_task(task_id, "failed", f"Account {req.account_id} not found")
            return

        yt = YouTube(
            account_uuid=account["id"],
            account_nickname=account["nickname"],
            credentials=account["credentials"],
            niche=req.niche or account["niche"],
            language=req.language or account["language"]
        )
        
        update_task(task_id, "running", "Generating video content...")
        tts = TTS()
        video_path = yt.generate_video(tts)
        
        result = {"video_path": video_path}
        
        if req.upload:
            update_task(task_id, "running", "Uploading video to YouTube...")
            success = yt.upload_video()
            result["uploaded"] = success
        
        update_task(task_id, "completed", "Task finished successfully", result)
    except Exception as e:
        update_task(task_id, "failed", str(e))

async def run_twitter_task(task_id: str, req: TwitterPostRequest):
    try:
        update_task(task_id, "running", "Initializing Twitter bot...", webhook_url=req.webhook_url)
        accounts = get_accounts("twitter")
        account = next((a for a in accounts if a["id"] == req.account_id), None)
        if not account:
            update_task(task_id, "failed", f"Account {req.account_id} not found")
            return

        tw = Twitter(
            account_uuid=account["id"],
            account_nickname=account["nickname"],
            api_key=get_twitter_api_key(),
            api_secret=get_twitter_api_secret(),
            access_token=account.get("access_token"),
            access_token_secret=account.get("access_token_secret"),
            topic=account["topic"]
        )
        
        update_task(task_id, "running", "Posting to Twitter...")
        tw.post(text=req.text)
        
        update_task(task_id, "completed", "Tweet posted successfully")
    except Exception as e:
        update_task(task_id, "failed", str(e))

async def run_afm_task(task_id: str, req: AFMCampaignRequest):
    try:
        update_task(task_id, "running", "Initializing Affiliate campaign...", webhook_url=req.webhook_url)
        accounts = get_accounts("twitter")
        account = next((a for a in accounts if a["id"] == req.twitter_account_id), None)
        if not account:
            update_task(task_id, "failed", f"Twitter Account {req.twitter_account_id} not found")
            return

        afm = AffiliateMarketing(
            req.affiliate_link,
            account["id"],
            account["nickname"],
            account["topic"],
            api_key=get_twitter_api_key(),
            api_secret=get_twitter_api_secret(),
            access_token=account.get("access_token"),
            access_token_secret=account.get("access_token_secret")
        )
        
        update_task(task_id, "running", "Generating and sharing pitch...")
        afm.generate_pitch()
        afm.share_pitch("twitter")
        
        update_task(task_id, "completed", "Affiliate campaign run successfully")
    except Exception as e:
        update_task(task_id, "failed", str(e))

@app.post("/tasks/youtube/generate", response_model=TaskResponse, dependencies=[Depends(get_current_user)])
def generate_youtube_video(req: YouTubeGenerateRequest, bg: BackgroundTasks):
    task_id = str(uuid.uuid4())
    update_task(task_id, "queued", "Task added to queue", webhook_url=req.webhook_url)
    bg.add_task(run_youtube_task, task_id, req)
    return TaskResponse(task_id=task_id, status="queued", message="Task started in background")

@app.post("/tasks/twitter/post", response_model=TaskResponse, dependencies=[Depends(get_current_user)])
def post_to_twitter(req: TwitterPostRequest, bg: BackgroundTasks):
    task_id = str(uuid.uuid4())
    update_task(task_id, "queued", "Task added to queue", webhook_url=req.webhook_url)
    bg.add_task(run_twitter_task, task_id, req)
    return TaskResponse(task_id=task_id, status="queued", message="Task started in background")

@app.post("/tasks/afm/run", response_model=TaskResponse, dependencies=[Depends(get_current_user)])
def run_afm_campaign(req: AFMCampaignRequest, bg: BackgroundTasks):
    task_id = str(uuid.uuid4())
    update_task(task_id, "queued", "Task added to queue", webhook_url=req.webhook_url)
    bg.add_task(run_afm_task, task_id, req)
    return TaskResponse(task_id=task_id, status="queued", message="Task started in background")

@app.get("/tasks/{task_id}", response_model=TaskResponse, dependencies=[Depends(get_current_user)])
def get_task_status(task_id: str):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse(task_id=task_id, **task)

@app.post("/schedule", dependencies=[Depends(get_current_user)])
def add_recurring_schedule(req: ScheduleRequest):
    schedules = load_schedules()
    schedules.append(req.dict())
    save_schedules(schedules)
    apply_schedules()
    return {"message": "Schedule added successfully"}

@app.post("/webhooks/subscribe", dependencies=[Depends(get_current_user)])
def subscribe_to_webhooks(sub: WebhookSubscription):
    add_webhook(sub.dict())
    return {"message": "Subscribed successfully"}

@app.websocket("/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await manager.connect(websocket, task_id)
    try:
        # Send current status immediately
        task = get_task(task_id)
        if task:
            await websocket.send_json({"task_id": task_id, **task})
        else:
            await websocket.send_json({"task_id": task_id, "status": "not_found", "message": "Task not found"})
        
        # Keep connection open
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)
    except Exception:
        manager.disconnect(websocket, task_id)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
