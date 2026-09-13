from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from app.auth.jwt_handler import (
    Token, User, verify_password, get_password_hash, create_access_token, get_current_user, USERS_DB
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class ResetPasswordRequest(BaseModel):
    username: str
    current_password: str
    new_password: str

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user_dict = USERS_DB.get(form_data.username)
    if not user_dict or not verify_password(form_data.password, user_dict["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user_dict.get("disabled", False):
        raise HTTPException(status_code=400, detail="Inactive user account")
    
    if user_dict.get("must_reset_password", False):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "detail": "Password reset required before first login.",
                "reset_required": True,
                "username": user_dict["username"]
            }
        )
    
    access_token = create_access_token(
        data={"sub": user_dict["username"], "role": user_dict["role"]}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user_dict["username"],
        "role": user_dict["role"]
    }

@router.post("/json-login", response_model=Token)
async def json_login(credentials: LoginRequest):
    user_dict = USERS_DB.get(credentials.username)
    if not user_dict or not verify_password(credentials.password, user_dict["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user_dict.get("disabled", False):
        raise HTTPException(status_code=400, detail="Inactive user account")
    
    if user_dict.get("must_reset_password", False):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "detail": "Password reset required before first login.",
                "reset_required": True,
                "username": user_dict["username"]
            }
        )
    
    access_token = create_access_token(
        data={"sub": user_dict["username"], "role": user_dict["role"]}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user_dict["username"],
        "role": user_dict["role"]
    }

@router.post("/reset-password", response_model=Token)
async def reset_password(payload: ResetPasswordRequest):
    user_dict = USERS_DB.get(payload.username)
    if not user_dict or not verify_password(payload.current_password, user_dict["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current temporary password is incorrect.",
        )
    if user_dict.get("disabled", False):
        raise HTTPException(status_code=400, detail="Inactive user account")
    
    new_pwd = payload.new_password.strip()
    if len(new_pwd) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long.",
        )
    if payload.current_password == new_pwd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the temporary password.",
        )
    
    # Update password and clear must_reset_password requirement
    user_dict["hashed_password"] = get_password_hash(new_pwd)
    user_dict["must_reset_password"] = False
    
    access_token = create_access_token(
        data={"sub": user_dict["username"], "role": user_dict["role"]}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user_dict["username"],
        "role": user_dict["role"]
    }

@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
