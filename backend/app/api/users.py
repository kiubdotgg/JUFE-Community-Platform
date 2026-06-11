from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.security import get_current_user_id
from app.schemas.schemas import UserProfileUpdate
from app.services.auth_service import get_user_profile, update_user_profile

router = APIRouter(prefix="/api/users", tags=["用户"])


@router.get("/me")
def get_profile(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        user = get_user_profile(db, user_id)
        return {"code": 0, "data": user.model_dump(), "msg": "获取成功"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}


@router.put("/me")
def update_profile(
    data: UserProfileUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        user = update_user_profile(db, user_id, data)
        return {"code": 0, "data": user.model_dump(), "msg": "更新成功"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}


@router.get("/{user_id}")
def get_user_detail(user_id: int, db: Session = Depends(get_db)):
    try:
        user = get_user_profile(db, user_id)
        return {"code": 0, "data": user.model_dump(), "msg": "获取成功"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}
