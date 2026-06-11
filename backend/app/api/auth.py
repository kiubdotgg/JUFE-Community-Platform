from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import UserRegister, UserLogin
from app.services.auth_service import register_user, login_user

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/register")
def register(data: UserRegister, db: Session = Depends(get_db)):
    try:
        user = register_user(db, data)
        return {"code": 0, "data": user.model_dump(), "msg": "注册成功"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}


@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    try:
        result = login_user(db, data)
        return {"code": 0, "data": result, "msg": "登录成功"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}
