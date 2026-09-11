import pytest
from app.auth.jwt_handler import verify_password, get_password_hash, create_access_token
from jose import jwt
from app.config import settings

def test_password_hashing():
    password = "MySecurePassword123!"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_generation():
    data = {"sub": "test_analyst", "role": "analyst"}
    token = create_access_token(data)
    assert token is not None
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload.get("sub") == "test_analyst"
    assert payload.get("role") == "analyst"
