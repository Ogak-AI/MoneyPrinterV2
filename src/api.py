import os
import uuid
import asyncio
import schedule
import subprocess
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
from config import assert_folder_structure, get_ollama_model, ROOT_DIR
from llm_provider import select_model
from database import init_db, get_db_connection
from auth_utils import get_password_hash, verify_password, create_access_token, decode_access_token

app = FastAPI(title="MoneyPrinterV2 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development and deployment ease
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "email": current_user["sub"]}

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

@app.post("/api/auth/register", response_model=UserResponse)
def register(user: UserRegister):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user_id = str(uuid.uuid4())
        hashed_pw = get_password_hash(user.password)
        cursor.execute("INSERT INTO users (id, email, hashed_password) VALUES (?, ?, ?)", 
                       (user_id, user.email, hashed_pw))
        conn.commit()
        return {"id": user_id, "email": user.email}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during registration")
    finally:
        conn.close()

@app.post("/api/auth/login")
def login(user: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (user.email,))
    db_user = cursor.fetchone()
    conn.close()

    if db_user is None or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": user.email, "id": db_user["id"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/accounts/{provider}", response_model=List[AccountResponse], dependencies=[Depends(get_current_user)])
def list_provider_accounts(provider: str):
    if provider not in ["youtube", "twitter"]:
        raise HTTPException(status_code=400, detail="Invalid provider")
    accounts = get_accounts(provider)
    return [AccountResponse(
        id=acc["id"],
        nickname=acc["nickname"],
        niche=acc.get("niche"),
        topic=acc.get("topic"),
        language=acc.get("language")
    ) for acc in accounts]

@app.post("/accounts/youtube", dependencies=[Depends(get_current_user)])
def register_youtube_account(acc: YouTubeAccount):
    account_id = str(uuid.uuid4())
    add_account("youtube", {
        "id": account_id,
        "nickname": acc.nickname,
        "firefox_profile": acc.firefox_profile,
        "niche": acc.niche,
        "language": acc.language,
        "videos": []
    })
    return {"id": account_id, "message": "Account registered"}

@app.post("/accounts/twitter", dependencies=[Depends(get_current_user)])
def register_twitter_account(acc: TwitterAccount):
    account_id = str(uuid.uuid4())
    add_account("twitter", {
        "id": account_id,
        "nickname": acc.nickname,
        "firefox_profile": acc.firefox_profile,
        "topic": acc.topic,
        "posts": []
    })
    return {"id": account_id, "message": "Account registered"}

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
            account["id"],
            account["nickname"],
            account["firefox_profile"],
            req.niche or account["niche"],
            req.language or account["language"]
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

        tw = Twitter(account["id"], account["nickname"], account["firefox_profile"], account["topic"])
        
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
            account["firefox_profile"],
            account["id"],
            account["nickname"],
            account["topic"]
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
