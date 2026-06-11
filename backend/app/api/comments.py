from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.security import get_current_user_id
from app.schemas.schemas import CommentCreate
from app.services.comment_service import create_comment, get_comments_tree, delete_comment

router = APIRouter(prefix="/api/comments", tags=["评论"])


@router.get("/posts/{post_id}")
def list_comments(post_id: int, db: Session = Depends(get_db)):
    comments = get_comments_tree(db, post_id)
    return {"code": 0, "data": _serialize_comments(comments), "msg": "获取成功"}


@router.post("/posts/{post_id}")
def add_comment(
    post_id: int,
    data: CommentCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        comment = create_comment(db, post_id, user_id, data)
        return {"code": 0, "data": comment.model_dump(), "msg": "评论成功"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}


@router.delete("/{comment_id}")
def remove_comment(
    comment_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        delete_comment(db, comment_id, user_id)
        return {"code": 0, "data": None, "msg": "删除成功"}
    except ValueError as e:
        return {"code": 1, "data": None, "msg": str(e)}


def _serialize_comments(comments: list) -> list:
    result = []
    for c in comments:
        d = c.model_dump()
        d["replies"] = _serialize_comments(c.replies)
        result.append(d)
    return result
