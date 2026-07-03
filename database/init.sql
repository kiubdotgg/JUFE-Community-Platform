-- ============================================
-- 校园交友平台 - 数据库初始化脚本
-- 后端: Python FastAPI
-- 数据库: MySQL
-- ============================================

CREATE DATABASE IF NOT EXISTS campus_friendship
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE campus_friendship;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    campus      VARCHAR(100) DEFAULT '',
    major       VARCHAR(100) DEFAULT '',
    grade       VARCHAR(20)  DEFAULT '',
    avatar_url  VARCHAR(500) DEFAULT '',
    bio         VARCHAR(300) DEFAULT '',
    gender      TINYINT      DEFAULT 0 COMMENT '0=未设置 1=男 2=女',
    birthday    DATE         DEFAULT NULL,
    interests   VARCHAR(500) DEFAULT '' COMMENT '兴趣标签，逗号分隔',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_campus (campus),
    INDEX idx_major  (major)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 帖子表
CREATE TABLE IF NOT EXISTS posts (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL,
    content     TEXT         NOT NULL,
    images      JSON         DEFAULT NULL COMMENT '图片URL数组',
    view_count  INT          NOT NULL DEFAULT 0,
    like_count  INT          NOT NULL DEFAULT 0,
    comment_count INT        NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_created (created_at DESC),
    INDEX idx_hot    (like_count DESC, comment_count DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 评论表 (邻接表 + path 字段实现层级查询)
CREATE TABLE IF NOT EXISTS comments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    post_id     INT          NOT NULL,
    user_id     INT          NOT NULL,
    parent_id   INT          DEFAULT NULL COMMENT '父评论ID，NULL=一级评论',
    path        VARCHAR(500) DEFAULT '' COMMENT '祖先路径，格式: /1/3/5/',
    content     TEXT         NOT NULL,
    like_count  INT          NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id)  REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_path (path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 点赞表
CREATE TABLE IF NOT EXISTS likes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL,
    post_id     INT          NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_post (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 好友关系表
CREATE TABLE IF NOT EXISTS friendships (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id_from    INT        NOT NULL,
    user_id_to      INT        NOT NULL,
    status          ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
    created_at      DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_relationship (user_id_from, user_id_to),
    FOREIGN KEY (user_id_from) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id_to)   REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_to_status (user_id_to, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- 收藏表
CREATE TABLE IF NOT EXISTS favorites (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL,
    post_id     INT          NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_favorite_user_post (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_favorite_user (user_id),
    INDEX idx_favorite_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
