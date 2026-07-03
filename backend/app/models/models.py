from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Enum, JSON, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    campus = Column(String(100), default="")
    major = Column(String(100), default="")
    grade = Column(String(20), default="")
    avatar_url = Column(String(500), default="")
    bio = Column(String(300), default="")
    gender = Column(Integer, default=0)
    birthday = Column(Date, nullable=True)
    interests = Column(String(500), default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    images = Column(JSON, nullable=True)
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    path = Column(String(500), default="")
    content = Column(Text, nullable=False)
    like_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="comments")


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id_from = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_id_to = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum("pending", "accepted", "rejected"), default="pending")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

# new function:favorite
class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uk_favorite_user_post"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="favorites")
    post = relationship("Post", back_populates="favorites")






