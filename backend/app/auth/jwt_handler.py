from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
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

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_user_from_token(token: Optional[str]) -> Optional[User]:
    """Validate a JWT and return the matching active user, or None if the token is invalid."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
    username = payload.get("sub")
    if not username:
        return None
    # Only trust identities that exist in the user store; role always comes from the store, not the token
    user_dict = USERS_DB.get(username)
    if user_dict is None or user_dict.get("disabled", False) or user_dict.get("must_reset_password", False):
        return None
    return User(**user_dict)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    user = get_user_from_token(token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
