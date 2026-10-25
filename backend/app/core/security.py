import hashlib
import hmac
import json
import base64
import time
from .config import settings

def get_password_hash(password: str) -> str:
    salt = b"emrg_salt_2026"
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 1000).hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password

def create_access_token(data: dict) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload = data.copy()
    payload["exp"] = int(time.time()) + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    payload_str = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = hmac.new(settings.SECRET_KEY.encode(), f"{header}.{payload_str}".encode(), hashlib.sha256).digest()
    sig_str = base64.urlsafe_b64encode(sig).decode().rstrip("=")
    return f"{header}.{payload_str}.{sig_str}"
