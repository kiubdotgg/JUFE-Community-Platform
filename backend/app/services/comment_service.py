from typing import List, Dict
from sqlalchemy.orm import Session
from app.models.models import Comment, User, Post
from app.schemas.schemas import CommentCreate, CommentResponse


def create_comment(db: Session, post_id: int, user_id: int, data: CommentCreate) -> CommentResponse:
    parent_id = data.parent_id
    path = ""

    if parent_id:
        parent = db.query(Comment).filter(Comment.id == parent_id, Comment.post_id == post_id).first()
        if not parent:
            raise ValueError("父评论不存在")
        path = parent.path + str(parent.id) + "/"

    comment = Comment(
        post_id=post_id,
        user_id=user_id,
        parent_id=parent_id,
        path=path,
        content=data.content,
    )
    db.add(comment)

    post = db.query(Post).filter(Post.id == post_id).first()
    if post:
        post.comment_count += 1

    db.commit()
    db.refresh(comment)

    user = db.query(User).filter(User.id == user_id).first()
    return _to_comment_response(comment, user)


def get_comments_tree(db: Session, post_id: int) -> List[CommentResponse]:
    comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at)
        .all()
    )

    user_ids = set(c.user_id for c in comments)
    users = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()}

    comment_map: Dict[int, CommentResponse] = {}
    roots: List[CommentResponse] = []

    for c in comments:
        resp = CommentResponse(
            id=c.id,
            post_id=c.post_id,
            user_id=c.user_id,
            username=users.get(c.user_id, User()).username,
            avatar_url=users.get(c.user_id, User()).avatar_url,
            parent_id=c.parent_id,
            content=c.content,
            like_count=c.like_count,
            created_at=c.created_at,
            replies=[],
        )
        comment_map[c.id] = resp

        if c.parent_id is None:
            roots.append(resp)
        else:
            parent = comment_map.get(c.parent_id)
            if parent:
                parent.replies.append(resp)

    return roots


def delete_comment(db: Session, comment_id: int, user_id: int):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.user_id == user_id).first()
    if not comment:
        raise ValueError("评论不存在或无权限删除")
    db.delete(comment)
    db.commit()


def _to_comment_response(comment: Comment, user: User) -> CommentResponse:
    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        username=user.username,
        avatar_url=user.avatar_url,
        parent_id=comment.parent_id,
        content=comment.content,
        like_count=comment.like_count,
        created_at=comment.created_at,
        replies=[],
    )
