from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.models import Post, Like, User, Favorite
from app.schemas.schemas import PostCreate, PostResponse, FavoriteItem, FavoriteListResponse

def create_post(db: Session, user_id: int, data: PostCreate) -> PostResponse:
    post = Post(
        user_id=user_id,
        content=data.content,
        images=data.images or [],
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    user = db.query(User).filter(User.id == user_id).first()
    return _to_post_response(post, user_id, db, user)

def get_posts(db: Session, current_user_id: int, skip: int = 0, limit: int = 20) -> List[PostResponse]:
    posts = (
        db.query(Post)
        .order_by(desc(Post.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for post in posts:
        user = db.query(User).filter(User.id == post.user_id).first()
        result.append(_to_post_response(post, current_user_id, db, user))
    return result

def get_hot_posts(db: Session, current_user_id: int, skip: int = 0, limit: int = 20) -> List[PostResponse]:
    posts = (
        db.query(Post)
        .order_by(desc(Post.like_count), desc(Post.comment_count))
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for post in posts:
        user = db.query(User).filter(User.id == post.user_id).first()
        result.append(_to_post_response(post, current_user_id, db, user))
    return result

def get_post_detail(db: Session, post_id: int, current_user_id: int) -> PostResponse:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise ValueError("帖子不存在")

    post.view_count += 1
    db.commit()
    db.refresh(post)

    user = db.query(User).filter(User.id == post.user_id).first()
    return _to_post_response(post, current_user_id, db, user)

def delete_post(db: Session, post_id: int, user_id: int):
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == user_id).first()
    if not post:
        raise ValueError("帖子不存在或无权限删除")
    db.delete(post)
    db.commit()

def add_favorite(db: Session, user_id: int, post_id: int):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise ValueError("帖子不存在")

    favorite = (
        db.query(Favorite)
        .filter(Favorite.user_id == user_id, Favorite.post_id == post_id)
        .first()
    )
    if favorite:
        return

    favorite = Favorite(user_id=user_id, post_id=post_id)
    db.add(favorite)
    db.commit()

def remove_favorite(db: Session, user_id: int, post_id: int):
    favorite = (
        db.query(Favorite)
        .filter(Favorite.user_id == user_id, Favorite.post_id == post_id)
        .first()
    )
    if not favorite:
        return

    db.delete(favorite)
    db.commit()

def get_my_favorites(db: Session, user_id: int) -> FavoriteListResponse:
    favorites = (
        db.query(Favorite)
        .filter(Favorite.user_id == user_id)
        .order_by(desc(Favorite.created_at))
        .all()
    )

    items = []
    for favorite in favorites:
        post = db.query(Post).filter(Post.id == favorite.post_id).first()
        if not post:
            continue

        user = db.query(User).filter(User.id == post.user_id).first()
        items.append(
            FavoriteItem(
                post_id=post.id,
                created_at=favorite.created_at,
                content=post.content,
                images=post.images,
                username=user.username if user else "",
                avatar_url=user.avatar_url if user else "",
                like_count=post.like_count,
                comment_count=post.comment_count,
            )
        )

    return FavoriteListResponse(items=items)

def _to_post_response(post: Post, current_user_id: int, db: Session, user: Optional[User]) -> PostResponse:
    is_liked = False
    is_favorited = False

    if current_user_id:
        like = db.query(Like).filter(Like.user_id == current_user_id, Like.post_id == post.id).first()
        favorite = db.query(Favorite).filter(Favorite.user_id == current_user_id, Favorite.post_id == post.id).first()
        is_liked = like is not None
        is_favorited = favorite is not None

    return PostResponse(
        id=post.id,
        user_id=post.user_id,
        username=user.username if user else "",
        avatar_url=user.avatar_url if user else "",
        content=post.content,
        images=post.images,
        view_count=post.view_count,
        like_count=post.like_count,
        comment_count=post.comment_count,
        is_liked=is_liked,
        is_favorited=is_favorited,
        created_at=post.created_at,
    )
