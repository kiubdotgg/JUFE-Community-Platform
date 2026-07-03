from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    campus: Optional[str] = None
    major: Optional[str] = None
    grade: Optional[str] = None
    bio: Optional[str] = None
    gender: Optional[int] = None
    birthday: Optional[date] = None
    interests: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    campus: str
    major: str
    grade: str
    avatar_url: str
    bio: str
    gender: int
    birthday: Optional[date]
    interests: str
    created_at: datetime

    class Config:
        from_attributes = True


class PostCreate(BaseModel):
    content: str
    images: Optional[List[str]] = None


class PostResponse(BaseModel):
    id: int
    user_id: int
    username: str = ""
    avatar_url: str = ""
    content: str
    images: Optional[List[str]]
    view_count: int
    like_count: int
    comment_count: int
    is_liked: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None


class CommentResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    username: str = ""
    avatar_url: str = ""
    parent_id: Optional[int]
    content: str
    like_count: int
    created_at: datetime
    replies: List["CommentResponse"] = []

    class Config:
        from_attributes = True


class FriendshipResponse(BaseModel):
    id: int
    user_id_from: int
    user_id_to: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class RecommendUser(BaseModel):
    id: int
    username: str
    avatar_url: str
    campus: str
    major: str
    grade: str
    bio: str
    interests: str
    score: float = 0.0

    class Config:
        from_attributes = True



class FavoriteItem(BaseModel):
    post_id: int
    created_at: datetime

class FavoriteListResponse(BaseModel):
    items: List[FavoriteItem]
