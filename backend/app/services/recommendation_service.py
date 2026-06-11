from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.models import User, Friendship, Post
from app.schemas.schemas import RecommendUser, FriendshipResponse


def toggle_like(db: Session, post_id: int, user_id: int) -> dict:
    from app.models.models import Like, Post

    existing = db.query(Like).filter(Like.user_id == user_id, Like.post_id == post_id).first()
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise ValueError("帖子不存在")

    if existing:
        db.delete(existing)
        post.like_count = max(0, post.like_count - 1)
        db.commit()
        return {"liked": False, "like_count": post.like_count}
    else:
        like = Like(user_id=user_id, post_id=post_id)
        db.add(like)
        post.like_count += 1
        db.commit()
        return {"liked": True, "like_count": post.like_count}


def send_friend_request(db: Session, from_user_id: int, to_user_id: int) -> FriendshipResponse:
    if from_user_id == to_user_id:
        raise ValueError("不能添加自己为好友")

    existing = db.query(Friendship).filter(
        or_(
            (Friendship.user_id_from == from_user_id) & (Friendship.user_id_to == to_user_id),
            (Friendship.user_id_from == to_user_id) & (Friendship.user_id_to == from_user_id),
        )
    ).first()

    if existing:
        if existing.status == "accepted":
            raise ValueError("已经是好友")
        if existing.status == "pending":
            raise ValueError("已有待处理的好友申请")

    friendship = Friendship(user_id_from=from_user_id, user_id_to=to_user_id)
    db.add(friendship)
    db.commit()
    db.refresh(friendship)
    return FriendshipResponse.model_validate(friendship)


def handle_friend_request(db: Session, friendship_id: int, user_id: int, action: str) -> FriendshipResponse:
    friendship = db.query(Friendship).filter(
        Friendship.id == friendship_id,
        Friendship.user_id_to == user_id,
        Friendship.status == "pending",
    ).first()
    if not friendship:
        raise ValueError("好友申请不存在或已处理")

    if action == "accept":
        friendship.status = "accepted"
    elif action == "reject":
        friendship.status = "rejected"
    else:
        raise ValueError("无效操作")

    db.commit()
    db.refresh(friendship)
    return FriendshipResponse.model_validate(friendship)


def get_friends(db: Session, user_id: int) -> List[dict]:
    friendships = db.query(Friendship).filter(
        (Friendship.user_id_from == user_id) | (Friendship.user_id_to == user_id),
        Friendship.status == "accepted",
    ).all()

    friend_ids = set()
    for f in friendships:
        if f.user_id_from == user_id:
            friend_ids.add(f.user_id_to)
        else:
            friend_ids.add(f.user_id_from)

    friends = db.query(User).filter(User.id.in_(friend_ids)).all()
    return [
        {"id": u.id, "username": u.username, "avatar_url": u.avatar_url, "campus": u.campus, "major": u.major}
        for u in friends
    ]


def get_recommendations(db: Session, user_id: int, limit: int = 20) -> List[RecommendUser]:
    me = db.query(User).filter(User.id == user_id).first()
    if not me:
        raise ValueError("用户不存在")

    friend_ids = set()
    friendships = db.query(Friendship).filter(
        (Friendship.user_id_from == user_id) | (Friendship.user_id_to == user_id)
    ).all()
    for f in friendships:
        friend_ids.add(f.user_id_from if f.user_id_from != user_id else f.user_id_to)

    candidates = db.query(User).filter(
        User.id != user_id,
        ~User.id.in_(friend_ids),
    ).limit(limit * 3).all()

    my_interests = set(i.strip() for i in me.interests.split(",") if i.strip())

    result: List[RecommendUser] = []
    for c in candidates:
        score = 0.0
        if c.campus and me.campus and c.campus == me.campus:
            score += 3.0
        if c.major and me.major and c.major == me.major:
            score += 2.0
        if c.grade and me.grade and c.grade == me.grade:
            score += 1.0

        c_interests = set(i.strip() for i in c.interests.split(",") if i.strip())
        common = my_interests & c_interests
        score += len(common) * 0.5

        post_count = db.query(Post).filter(Post.user_id == c.id).count()
        score += min(post_count * 0.1, 1.0)

        result.append(RecommendUser(
            id=c.id,
            username=c.username,
            avatar_url=c.avatar_url,
            campus=c.campus,
            major=c.major,
            grade=c.grade,
            bio=c.bio,
            interests=c.interests,
            score=round(score, 2),
        ))

    result.sort(key=lambda x: x.score, reverse=True)
    return result[:limit]
