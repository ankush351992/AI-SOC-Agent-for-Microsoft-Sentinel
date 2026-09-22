from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class User(BaseModel):
    username: str
    email: str
    role: str
    full_name: str
    disabled: Optional[bool] = False
    must_reset_password: Optional[bool] = False

def get_password_hash(password: str) -> str:
    """Secure PBKDF2-HMAC-SHA256 password hashing (independent of bcrypt/passlib version bugs)"""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against PBKDF2 hashed password"""
    try:
        salt, key = hashed_password.split("$")
        check_key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return secrets.compare_digest(key, check_key.hex())
    except Exception:
        return False

# In-memory user database (initialized with random credentials on first run)
USERS_DB = {}

DEFAULT_ACCOUNTS_CONFIG = [
    {
        "username": settings.ADMIN_USERNAME or "soc_admin",
        "full_name": "SOC Lead Engineer",
        "email": "soc-admin@cybersecurity.corp",
        "role": "admin",
    },
    {
        "username": "analyst",
        "full_name": "Tier-2 SOC Analyst",
        "email": "analyst@cybersecurity.corp",
        "role": "analyst",
    },
    {
        "username": "tier1_analyst",
        "full_name": "Tier-1 SOC Investigator",
        "email": "tier1@cybersecurity.corp",
        "role": "analyst",
    },
]

def init_default_users() -> dict:
    """
    On application startup, checks if each default account exists in the user store.
    For ALL default accounts (including soc_admin, analyst, tier1_analyst), generates a
    cryptographically secure random temporary password, hashes it, and creates the account
    with must_reset_password = True.
    Logs and outputs the generated temporary credentials clearly.
    """
    import logging
    auth_logger = logging.getLogger("sentinel_soc_agent.auth")
    newly_generated = []

    for account in DEFAULT_ACCOUNTS_CONFIG:
        username = account["username"]
        if username not in USERS_DB:
            raw_password = secrets.token_urlsafe(12)
            USERS_DB[username] = {
                "username": username,
                "full_name": account["full_name"],
                "email": account["email"],
                "hashed_password": get_password_hash(raw_password),
                "role": account["role"],
                "disabled": False,
                "must_reset_password": True,
            }
            newly_generated.append((username, account["role"], raw_password))

    if newly_generated:
        banner = "\n" + "=" * 80 + "\n"
        banner += "[SECURITY NOTICE] All user accounts initialized with random temporary credentials.\n"
        banner += "Every user MUST reset their password on first login via the portal.\n"
        banner += "-" * 80 + "\n"
        for username, role, pwd in newly_generated:
            banner += f"  Username: {username:<18} | Role: {role:<10} | Temporary Password: {pwd}\n"
        banner += "=" * 80 + "\n"
        auth_logger.warning(banner)
        try:
            print(banner)
        except Exception:
            pass

    return USERS_DB

# Ensure default users are initialized on module load
init_default_users()

def get_client_fingerprint(request: Optional[Request]) -> Optional[str]:
    """Derive a binding fingerprint from the client's IP and User-Agent so a stolen
    token cannot be replayed from a different client/location."""
    if request is None:
        return None
    client_host = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")
    raw = f"{client_host}|{user_agent}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None, request: Optional[Request] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    fingerprint = get_client_fingerprint(request)
    if fingerprint:
        to_encode.update({"fp": fingerprint})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request, token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role", "analyst")
        token_fp: str = payload.get("fp")
        if username is None:
            raise credentials_exception
        if token_fp and token_fp != get_client_fingerprint(request):
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except JWTError:
        raise credentials_exception
        
    user_dict = USERS_DB.get(token_data.username)
    if user_dict is None:
        # Support fallback user for dynamic login if authenticated via external SSO
        return User(username=token_data.username, email=f"{token_data.username}@corp.local", role=token_data.role, full_name=token_data.username)
    return User(**user_dict)
