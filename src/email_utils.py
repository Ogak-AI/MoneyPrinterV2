import os
import httpx

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

def send_resend_email(to_email: str, subject: str, html_content: str) -> bool:
    api_key = os.environ.get("RESEND_API_KEY")
    sender_email = os.environ.get("RESEND_SENDER_EMAIL", "onboarding@resend.dev")

    if not api_key:
        print(f"Warning: RESEND_API_KEY not set in environment. Cannot send email to {to_email}.")
        return False

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "from": sender_email,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }

    try:
        # Use httpx to make the REST call
        response = httpx.post(url, headers=headers, json=payload, timeout=10.0)
        if response.status_code in (200, 201):
            return True
        else:
            print(f"Resend API Error ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        print(f"Exception while connecting to Resend API: {e}")
        return False

def send_verification_email(receiver_email: str, token: str, otp: str = None):
    verification_link = f"{FRONTEND_URL}/verify?token={token}&email={receiver_email}"
    
    subject = "Verify your MoneyPrinterV2 account"
    # Join the standard lines with strings
    html_content = "".join([
        "<h1>Welcome to MoneyPrinterV2!</h1>",
        "<p>Thank you for joining. Please verify your email using one of the following methods:</p>",
        "<h2>Method 1: Click the Link</h2>",
        f"<p><a href='{verification_link}'>{verification_link}</a></p>",
        "<h2>Method 2: Use OTP</h2>",
        "<p>Enter the following 6-digit code on the verification page:</p>",
        f"<p style='font-size: 24px; font-weight: bold; letter-spacing: 5px;'>{otp}</p>",
        "<p>If you didn't create an account, you can safely ignore this email.</p>"
    ])

    if not send_resend_email(receiver_email, subject, html_content):
        print(f"DEBUG: Failed to send Verification token to {receiver_email}. Token: {token} | OTP: {otp}")
        return False
    return True

def send_password_reset_email(receiver_email: str, token: str):
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    
    subject = "Reset your MoneyPrinterV2 password"
    html_content = "".join([
        "<h1>Password Reset Request</h1>",
        "<p>You requested a password reset. Click the link below to set a new password:</p>",
        f"<p><a href='{reset_link}'>{reset_link}</a></p>",
        "<p>This link will expire in 1 hour.</p>",
        "<p>If you didn't request this, please ignore this email.</p>"
    ])

    if not send_resend_email(receiver_email, subject, html_content):
        print(f"DEBUG: Failed to send Password Reset to {receiver_email}. Token: {token}")
        return False
    return True
