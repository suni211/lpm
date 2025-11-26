-- 친선경기 시스템 DB 스키마
-- 1:1 초대, 초대 수락 시 경기 실행, 집계 X

-- 친선경기 초대 테이블
CREATE TABLE IF NOT EXISTS friendly_invites (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    inviter_team_id CHAR(36) NOT NULL,
    invitee_team_id CHAR(36) NOT NULL,
    message TEXT, -- 초대 메시지
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ACCEPTED, DECLINED, CANCELLED, EXPIRED
    invited_at DATETIME NOT NULL,
    responded_at DATETIME,
    expires_at DATETIME NOT NULL, -- 초대 만료 시간 (24시간)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inviter_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (invitee_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    INDEX idx_invitee_pending (invitee_team_id, status, invited_at DESC),
    INDEX idx_inviter (inviter_team_id, invited_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 친선경기 매치 테이블
CREATE TABLE IF NOT EXISTS friendly_matches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    invite_id CHAR(36) NOT NULL,
    team1_id CHAR(36) NOT NULL,
    team2_id CHAR(36) NOT NULL,
    winner_id CHAR(36),
    match_date DATETIME NOT NULL,
    match_duration INT, -- 경기 시간 (초)
    match_data JSON, -- 경기 상세 데이터 (페이즈별 결과 등)
    is_practice BOOLEAN DEFAULT TRUE, -- 연습 경기 여부 (집계 안됨)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invite_id) REFERENCES friendly_invites(id) ON DELETE CASCADE,
    FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL,
    INDEX idx_team_matches (team1_id, match_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 친선경기 통계 (개인 기록용, 랭크에 영향 X)
CREATE TABLE IF NOT EXISTS friendly_match_stats (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,
    total_matches INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE KEY (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
