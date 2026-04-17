"""
MoneyPrinter API — Pydantic request/response models.
All Field() annotations feed directly into the OpenAPI /docs UI.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal


# ── OAuth ──────────────────────────────────────────────────────────────────────

class TwitterOAuthVerifyRequest(BaseModel):
    nickname: str = Field(..., examples=["MyTwitterBot"], description="Friendly display name for this account")
    topic: str = Field(..., examples=["AI & Technology"], description="Topic this account will tweet about")
    oauth_token: str = Field(..., description="OAuth token returned from /accounts/twitter/init")
    oauth_token_secret: str = Field(..., description="OAuth token secret returned from /accounts/twitter/init")
    pin: str = Field(..., examples=["1234567"], description="PIN displayed on the Twitter authorization page")


class YouTubeOAuthVerifyRequest(BaseModel):
    nickname: str = Field(..., examples=["MyYouTubeChannel"], description="Friendly display name for this channel")
    auth_code: str = Field(..., description="Authorization code returned by Google OAuth redirect")
    niche: str = Field(..., examples=["Motivation"], description="Content niche for this channel")
    language: str = Field(..., examples=["English"], description="Language for generated video narration")
    code_verifier: Optional[str] = Field(None, description="PKCE code verifier (returned from /accounts/youtube/init)")


# ── Accounts ───────────────────────────────────────────────────────────────────

class AccountResponse(BaseModel):
    id: str = Field(..., description="Unique account UUID")
    nickname: str = Field(..., description="Friendly display name")
    provider: Optional[str] = Field(None, description="Platform: 'youtube' or 'twitter'")
    niche: Optional[str] = Field(None, description="Content niche (YouTube accounts)")
    topic: Optional[str] = Field(None, description="Tweet topic (Twitter accounts)")
    language: Optional[str] = Field(None, description="Language (YouTube accounts)")


# ── Tasks ──────────────────────────────────────────────────────────────────────

class YouTubeGenerateRequest(BaseModel):
    account_id: str = Field(..., description="UUID of the YouTube account to use")
    niche: str = Field(..., examples=["Motivation"], description="Video niche / topic")
    language: Optional[str] = Field(None, examples=["English"], description="Override account language")
    upload: bool = Field(False, description="If true, upload the generated video immediately after generation")
    webhook_url: Optional[str] = Field(None, examples=["https://example.com/hook"], description="Optional URL to notify on task completion")


class TwitterPostRequest(BaseModel):
    account_id: str = Field(..., description="UUID of the Twitter account to use")
    text: Optional[str] = Field(None, examples=["AI is changing everything. Here's what you need to know 🧵"], description="Tweet text. Leave empty to auto-generate from account topic")
    webhook_url: Optional[str] = Field(None, description="Optional URL to notify on task completion")


class AFMCampaignRequest(BaseModel):
    affiliate_link: str = Field(..., examples=["https://amazon.com/dp/EXAMPLE"], description="Full affiliate product URL to promote")
    twitter_account_id: str = Field(..., description="UUID of the Twitter account to post from")
    webhook_url: Optional[str] = Field(None, description="Optional URL to notify on task completion")


class TaskStatus(str):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskResponse(BaseModel):
    task_id: str = Field(..., description="Unique task UUID — use this to poll /tasks/{task_id} or connect to /ws/{task_id}")
    status: str = Field(..., description="Current status: queued | running | completed | failed")
    message: str = Field(..., description="Human-readable progress message")
    provider: Optional[str] = Field(None, description="Provider this task targets: youtube | twitter | afm")
    result: Optional[Dict[str, Any]] = Field(None, description="Task output on completion (e.g. video_path, uploaded)")
    updated_at: Optional[str] = Field(None, description="ISO-8601 timestamp of the last status update")
    webhook_url: Optional[str] = Field(None, description="Webhook URL registered for this task")


# ── Webhooks ───────────────────────────────────────────────────────────────────

class WebhookSubscription(BaseModel):
    url: str = Field(..., examples=["https://myserver.com/hooks/moneyprinter"], description="URL that will receive POST requests on task events")
    events: List[str] = Field(
        ["*"],
        examples=[["task.completed", "task.failed"]],
        description="Event filter list. Use ['*'] to receive all events"
    )


# ── Schedules ──────────────────────────────────────────────────────────────────

class ScheduleRequest(BaseModel):
    provider: Literal["youtube", "twitter"] = Field(..., description="Platform to run scheduled jobs for")
    account_id: str = Field(..., description="UUID of the account to schedule for")
    frequency: Literal["once_a_day", "twice_a_day", "thrice_a_day"] = Field(..., description="How often to post")
    time: Optional[str] = Field(None, examples=["09:00"], description="Specific time for 'once_a_day' (HH:MM, 24h). Defaults to 10:00")


class ScheduleResponse(BaseModel):
    provider: str
    account_id: str
    frequency: str
    time: Optional[str] = None


# ── Auth ───────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: str = Field(..., examples=["user@example.com"])
    password: str = Field(..., min_length=8, examples=["supersecret123"])


class UserLogin(BaseModel):
    email: str = Field(..., examples=["user@example.com"])
    password: str = Field(..., examples=["supersecret123"])


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str


class PasswordResetRequest(BaseModel):
    email: str = Field(..., examples=["user@example.com"])


class PasswordResetConfirm(BaseModel):
    token: str = Field(..., description="Reset token from the email link")
    new_password: str = Field(..., min_length=8)


class OTPVerifyRequest(BaseModel):
    email: str
    otp: str = Field(..., examples=["482910"], description="6-digit OTP from verification email")


class VerificationResponse(BaseModel):
    message: str
    success: bool


# ── Health ─────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = Field(..., examples=["healthy"])
    version: str = Field(..., examples=["1.0.0"])
    timestamp: str = Field(..., description="Current server UTC time (ISO-8601)")
    accounts: Dict[str, int] = Field(..., description="Number of registered accounts per provider")
    pending_tasks: int = Field(..., description="Number of tasks currently queued or running")
    schedules: int = Field(..., description="Number of active recurring schedules")
