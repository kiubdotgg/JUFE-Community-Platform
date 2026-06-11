from sqlalchemy.orm import Session
from app.models.models import User
from app.schemas.schemas import UserRegister, UserLogin, UserResponse, UserProfileUpdate
from app.utils.security import hash_password, verify_password, create_access_token


def register_user(db: Session, data: UserRegister) -> UserResponse:
    existing = db.query(User).filter(
        (User.email == data.email) | (User.username == data.username)
    ).first()
    if existing:
        if existing.email == data.email:
            raise ValueError("该邮箱已被注册")
        raise ValueError("该用户名已被占用")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


def login_user(db: Session, data: UserLogin) -> dict:
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise ValueError("邮箱或密码错误")

    token = create_access_token({"user_id": user.id})
    return {"access_token": token, "token_type": "bearer"}


def get_user_profile(db: Session, user_id: int) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("用户不存在")
    return UserResponse.model_validate(user)


def update_user_profile(db: Session, user_id: int, data: UserProfileUpdate) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("用户不存在")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)
