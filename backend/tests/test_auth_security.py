import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from app.auth.jwt_handler import create_access_token, get_password_hash, USERS_DB
from app.config import Settings, _ensure_secure_secret_key, settings
from app.main import app

client = TestClient(app)


def _add_user(username, role="analyst", **overrides):
    USERS_DB[username] = {
        "username": username,
        "full_name": username,
        "email": f"{username}@corp.local",
        "hashed_password": get_password_hash("Irrelevant123!"),
        "role": role,
        "disabled": False,
        "must_reset_password": False,
        **overrides,
    }


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_default_secret_key_is_not_a_published_placeholder():
    assert settings.SECRET_KEY != "sentinel-super-secret-key-change-in-production-2026"
    assert len(settings.SECRET_KEY) >= 32


def test_insecure_secret_key_refused_in_live_mode():
    for key in (None, "short", "sentinel-super-secret-key-change-in-production-2026"):
        cfg = Settings(SECRET_KEY=key, DEMO_MODE=False)
        with pytest.raises(RuntimeError):
            _ensure_secure_secret_key(cfg)


def test_insecure_secret_key_replaced_in_demo_mode():
    cfg = Settings(SECRET_KEY="change-to-a-secure-random-secret-key-for-jwt", DEMO_MODE=True)
    _ensure_secure_secret_key(cfg)
    assert cfg.SECRET_KEY != "change-to-a-secure-random-secret-key-for-jwt"
    assert len(cfg.SECRET_KEY) >= 32


def test_token_for_unknown_user_is_rejected():
    token = create_access_token({"sub": "ghost_admin", "role": "admin"})
    res = client.get("/api/auth/me", headers=_auth(token))
    assert res.status_code == 401
    res = client.get("/api/settings/status", headers=_auth(token))
    assert res.status_code == 401


def test_role_claim_in_token_is_ignored():
    _add_user("sec_test_analyst", role="analyst")
    token = create_access_token({"sub": "sec_test_analyst", "role": "admin"})
    res = client.get("/api/auth/me", headers=_auth(token))
    assert res.status_code == 200
    assert res.json()["role"] == "analyst"
    res = client.post("/api/settings/update", json={"demo_mode": True}, headers=_auth(token))
    assert res.status_code == 403


def test_disabled_or_pending_reset_users_are_rejected():
    _add_user("sec_test_disabled", disabled=True)
    _add_user("sec_test_pending", must_reset_password=True)
    for username in ("sec_test_disabled", "sec_test_pending"):
        token = create_access_token({"sub": username, "role": "analyst"})
        assert client.get("/api/auth/me", headers=_auth(token)).status_code == 401


def test_websocket_requires_valid_token():
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/ws/triage/any-incident") as ws:
            ws.receive_json()
    assert exc.value.code == 1008

    forged = create_access_token({"sub": "ghost_admin", "role": "admin"})
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/ws/triage/any-incident?token={forged}") as ws:
            ws.receive_json()
    assert exc.value.code == 1008


def test_websocket_accepts_valid_token():
    _add_user("sec_test_ws")
    token = create_access_token({"sub": "sec_test_ws", "role": "analyst"})
    with client.websocket_connect(f"/ws/triage/does-not-exist?token={token}") as ws:
        msg = ws.receive_json()
    assert msg["event"] == "ERROR"


def test_settings_update_rejects_line_breaks():
    _add_user("sec_test_admin", role="admin")
    token = create_access_token({"sub": "sec_test_admin", "role": "admin"})
    res = client.post(
        "/api/settings/update",
        json={"azure_workspace_name": "ws\nSECRET_KEY=attacker-known"},
        headers=_auth(token),
    )
    assert res.status_code == 400
