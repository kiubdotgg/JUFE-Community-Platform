from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.security import get_current_user_id
from app.schemas.schemas import PostCreate
from app.services import post_service

router = APIRouter(prefix="/api/posts", tags=["帖子"])


@router.get("")
def list_posts(
    sort: str = Query("latest"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * page_size
    if sort == "hot":
        posts = post_service.get_hot_posts(db, user_id, skip, page_size)
    else:
        posts = post_service.get_posts(db, user_id, skip, page_size)
    return {"code": 0, "data": [p.model_dump() for p in posts], "msg": "获取成功"}


@router.post("")
def create_post(
    data: PostCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        post = post_service.create_post(db, user_id, data)
        return {"code": 0, "data": post.model_dump(), "msg": "发布成功"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}


@router.get("/{post_id}")
def get_post(
    post_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        post = post_service.get_post_detail(db, post_id, user_id)
        return {"code": 0, "data": post.model_dump(), "msg": "获取成功"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        post_service.delete_post(db, post_id, user_id)
        return {"code": 0, "data": None, "msg": "删除成功"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}
