from app.auth.jwt_handler import (
    verify_password, get_password_hash, create_access_token, init_default_users, USERS_DB
)
from jose import jwt
from app.config import settings
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

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

def test_init_default_users():
    users = init_default_users()
    assert "soc_admin" in users
    assert "analyst" in users
    assert "tier1_analyst" in users
    for uname, udata in users.items():
        assert udata["hashed_password"] is not None
        assert udata["must_reset_password"] is True

def test_login_and_password_reset_flow():
    # Set up a clean test user
    test_user = "test_user_reset"
    temp_pwd = "TempPassword123!"
    USERS_DB[test_user] = {
        "username": test_user,
        "full_name": "Test User",
        "email": "test@corp.local",
        "hashed_password": get_password_hash(temp_pwd),
        "role": "analyst",
        "disabled": False,
        "must_reset_password": True,
    }

    # 1. Login with temporary password should return 403 reset_required
    login_res = client.post("/api/auth/json-login", json={"username": test_user, "password": temp_pwd})
    assert login_res.status_code == 403
    assert login_res.json().get("reset_required") is True

    # 2. Reset password with invalid current password fails
    bad_reset = client.post("/api/auth/reset-password", json={
        "username": test_user,
        "current_password": "WrongPassword",
        "new_password": "NewPermanentPassword2026!"
    })
    assert bad_reset.status_code == 400

    # 3. Reset password with short password fails
    short_reset = client.post("/api/auth/reset-password", json={
        "username": test_user,
        "current_password": temp_pwd,
        "new_password": "short"
    })
    assert short_reset.status_code == 400

    # 4. Successful password reset
    new_pwd = "NewPermanentPassword2026!"
    reset_res = client.post("/api/auth/reset-password", json={
        "username": test_user,
        "current_password": temp_pwd,
        "new_password": new_pwd
    })
    assert reset_res.status_code == 200
    assert "access_token" in reset_res.json()
    assert USERS_DB[test_user]["must_reset_password"] is False

    # 5. Subsequent login with new password succeeds immediately
    subsequent_login = client.post("/api/auth/json-login", json={"username": test_user, "password": new_pwd})
    assert subsequent_login.status_code == 200
    assert "access_token" in subsequent_login.json()
