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

# Hardcoded default users for local/SOC environment (Can be wired to Entra ID/SSO)
USERS_DB = {
    settings.ADMIN_USERNAME: {
        "username": settings.ADMIN_USERNAME,
        "full_name": "SOC Lead Engineer",
        "email": "soc-admin@cybersecurity.corp",
        "hashed_password": get_password_hash(settings.ADMIN_PASSWORD),
        "role": "admin",
        "disabled": False,
    },
    "analyst": {
        "username": "analyst",
        "full_name": "Tier-2 SOC Analyst",
        "email": "analyst@cybersecurity.corp",
        "hashed_password": get_password_hash("Analyst2026!"),
        "role": "analyst",
        "disabled": False,
    },
    "tier1_analyst": {
        "username": "tier1_analyst",
        "full_name": "Tier-1 SOC Investigator",
        "email": "tier1@cybersecurity.corp",
        "hashed_password": get_password_hash("Analyst2026!"),
        "role": "analyst",
        "disabled": False,
    },
    "incident_responder": {
        "username": "incident_responder",
        "full_name": "Incident Response Specialist",
        "email": "ir@cybersecurity.corp",
        "hashed_password": get_password_hash("Responder2026!"),
        "role": "responder",
        "disabled": False,
    }
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role", "analyst")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except JWTError:
        raise credentials_exception
        
    user_dict = USERS_DB.get(token_data.username)
    if user_dict is None:
        # Support fallback user for dynamic login if authenticated via external SSO
        return User(username=token_data.username, email=f"{token_data.username}@corp.local", role=token_data.role, full_name=token_data.username)
    return User(**user_dict)
