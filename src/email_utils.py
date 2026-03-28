import yagmail
import os
from config import get_email_credentials, ROOT_DIR

# Base URL for verification and reset links
# In production, this should be the actual frontend URL
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

def send_verification_email(receiver_email: str, token: str):
    creds = get_email_credentials()
    if not creds.get("username") or not creds.get("password"):
        print(f"Warning: Email credentials not set. Verification token for {receiver_email} is: {token}")
        return False

    yag = yagmail.SMTP(
        user=creds["username"],
        password=creds["password"],
        host=creds["smtp_server"],
        port=creds["smtp_port"],
    )

    verification_link = f"{FRONTEND_URL}/verify?token={token}"
    
    subject = "Verify your MoneyPrinterV2 account"
    contents = [
        f"<h1>Welcome to MoneyPrinterV2!</h1>",
        f"<p>Please click the link below to verify your email address:</p>",
        f"<p><a href='{verification_link}'>{verification_link}</a></p>",
        f"<p>If you didn't create an account, you can safely ignore this email.</p>"
    ]

    try:
        yag.send(to=receiver_email, subject=subject, contents=contents)
        return True
    except Exception as e:
        print(f"Error sending verification email: {e}")
        return False

def send_password_reset_email(receiver_email: str, token: str):
    creds = get_email_credentials()
    if not creds.get("username") or not creds.get("password"):
        print(f"Warning: Email credentials not set. Reset token for {receiver_email} is: {token}")
        return False

    yag = yagmail.SMTP(
        user=creds["username"],
        password=creds["password"],
        host=creds["smtp_server"],
        port=creds["smtp_port"],
    )

    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    
    subject = "Reset your MoneyPrinterV2 password"
    contents = [
        f"<h1>Password Reset Request</h1>",
        f"<p>You requested a password reset. Click the link below to set a new password:</p>",
        f"<p><a href='{reset_link}'>{reset_link}</a></p>",
        f"<p>This link will expire in 1 hour.</p>",
        f"<p>If you didn't request this, please ignore this email.</p>"
    ]

    try:
        yag.send(to=receiver_email, subject=subject, contents=contents)
        return True
    except Exception as e:
        print(f"Error sending password reset email: {e}")
        return False
