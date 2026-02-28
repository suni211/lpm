-- Migration: Add news and news_comments tables
-- Date: 2025-11-27
-- Purpose: Enable admin news posting with user comments

USE lico_db;

-- 뉴스 테이블
CREATE TABLE IF NOT EXISTS news (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    admin_id CHAR(36) NOT NULL COMMENT '작성한 관리자 ID',
    title VARCHAR(200) NOT NULL COMMENT '뉴스 제목',
    content TEXT NOT NULL COMMENT '뉴스 내용',
    image_url VARCHAR(500) NULL COMMENT '뉴스 이미지 URL',
    view_count INT DEFAULT 0 COMMENT '조회수',
    is_pinned BOOLEAN DEFAULT FALSE COMMENT '상단 고정 여부',
    status ENUM('DRAFT', 'PUBLISHED', 'HIDDEN') DEFAULT 'PUBLISHED' COMMENT '뉴스 상태',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id),
    INDEX idx_admin (admin_id),
    INDEX idx_status (status),
    INDEX idx_pinned (is_pinned),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 뉴스 댓글 테이블
CREATE TABLE IF NOT EXISTS news_comments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    news_id CHAR(36) NOT NULL COMMENT '뉴스 ID',
    wallet_id CHAR(36) NOT NULL COMMENT '작성자 지갑 ID',
    content TEXT NOT NULL COMMENT '댓글 내용',
    parent_comment_id CHAR(36) NULL COMMENT '부모 댓글 ID (대댓글인 경우)',
    is_deleted BOOLEAN DEFAULT FALSE COMMENT '삭제 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id),
    FOREIGN KEY (parent_comment_id) REFERENCES news_comments(id) ON DELETE CASCADE,
    INDEX idx_news (news_id),
    INDEX idx_wallet (wallet_id),
    INDEX idx_parent (parent_comment_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
