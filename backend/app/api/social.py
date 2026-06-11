from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.security import get_current_user_id
from app.services.recommendation_service import (
    toggle_like, send_friend_request, handle_friend_request,
    get_friends, get_recommendations,
)

router = APIRouter(prefix="/api/social", tags=["社交"])


@router.post("/likes/{post_id}")
def like_post(
    post_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        result = toggle_like(db, post_id, user_id)
        return {"code": 0, "data": result, "msg": "操作成功"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}


@router.post("/friendships/request/{to_user_id}")
def request_friend(
    to_user_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        result = send_friend_request(db, user_id, to_user_id)
        return {"code": 0, "data": result.model_dump(), "msg": "好友申请已发送"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}


@router.put("/friendships/{friendship_id}")
def handle_friend(
    friendship_id: int,
    action: str = Query(...),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        result = handle_friend_request(db, friendship_id, user_id, action)
        msg = "已接受好友申请" if action == "accept" else "已拒绝好友申请"
        return {"code": 0, "data": result.model_dump(), "msg": msg}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}


@router.get("/friendships")
def list_pending_requests(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    from app.models.models import Friendship, User
    pending = db.query(Friendship).filter(
        Friendship.user_id_to == user_id,
        Friendship.status == "pending",
    ).all()
    result = []
    for f in pending:
        from_user = db.query(User).filter(User.id == f.user_id_from).first()
        result.append({
            "id": f.id,
            "from_user": {
                "id": from_user.id,
                "username": from_user.username,
                "avatar_url": from_user.avatar_url,
            },
            "created_at": f.created_at.isoformat(),
        })
    return {"code": 0, "data": result, "msg": "获取成功"}


@router.get("/friends")
def list_friends(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    result = get_friends(db, user_id)
    return {"code": 0, "data": result, "msg": "获取成功"}


@router.get("/recommendations")
def recommend_users(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        result = get_recommendations(db, user_id)
        return {"code": 0, "data": [r.model_dump() for r in result], "msg": "获取成功"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}
