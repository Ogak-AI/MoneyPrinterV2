from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class YouTubeAccount(BaseModel):
    nickname: str
    firefox_profile: str
    niche: str
    language: str

class TwitterAccount(BaseModel):
    nickname: str
    firefox_profile: str
    topic: str

class AccountResponse(BaseModel):
    id: str
    nickname: str
    niche: Optional[str] = None
    topic: Optional[str] = None
    language: Optional[str] = None

class YouTubeGenerateRequest(BaseModel):
    account_id: str
    niche: Optional[str] = None
    language: Optional[str] = None
    upload: bool = False
    webhook_url: Optional[str] = None

class TwitterPostRequest(BaseModel):
    account_id: str
    text: Optional[str] = None
    webhook_url: Optional[str] = None

class AFMCampaignRequest(BaseModel):
    affiliate_link: str
    twitter_account_id: str
    webhook_url: Optional[str] = None

class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str
    result: Optional[Dict[str, Any]] = None

class WebhookSubscription(BaseModel):
    url: str
    events: List[str] = ["*"]

class ScheduleRequest(BaseModel):
    provider: str  # "youtube" or "twitter"
    account_id: str
    frequency: str  # "once_a_day", "twice_a_day", "thrice_a_day"
    time: Optional[str] = None  # Specific time like "10:00" (optional)

class UserRegister(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    email: str

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class OTPVerifyRequest(BaseModel):
    email: str
    otp: str

class VerificationResponse(BaseModel):
    message: str
    success: bool
