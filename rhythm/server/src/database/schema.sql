-- Rhythm Game Database Schema (MariaDB)

CREATE DATABASE IF NOT EXISTS rhythm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rhythm_db;

-- 관리자 계정 테이블
CREATE TABLE admins (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('SUPER_ADMIN', 'ADMIN') DEFAULT 'ADMIN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자 계정 테이블
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    avatar_url VARCHAR(500) NULL,
    total_score BIGINT DEFAULT 0 COMMENT '총 누적 점수',
    total_plays INT DEFAULT 0 COMMENT '총 플레이 횟수',
    level INT DEFAULT 1 COMMENT '사용자 레벨',
    experience INT DEFAULT 0 COMMENT '경험치',
    status ENUM('ACTIVE', 'SUSPENDED', 'BANNED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_total_score (total_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 노래 정보 테이블
CREATE TABLE songs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(200) NOT NULL COMMENT '노래 제목',
    artist VARCHAR(200) NOT NULL COMMENT '아티스트',
    bpm DECIMAL(6, 2) NOT NULL COMMENT 'BPM (Beats Per Minute)',
    duration INT NOT NULL COMMENT '노래 길이 (초)',
    audio_file_path VARCHAR(500) NOT NULL COMMENT '오디오 파일 경로',
    cover_image_url VARCHAR(500) NULL COMMENT '앨범 커버 이미지',
    bga_video_url VARCHAR(500) NULL COMMENT 'BGA 배경 비디오 URL',
    preview_start INT DEFAULT 0 COMMENT '미리듣기 시작 시간 (초)',
    genre VARCHAR(50) NULL COMMENT '장르',
    description TEXT NULL,
    status ENUM('ACTIVE', 'HIDDEN', 'MAINTENANCE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_title (title),
    INDEX idx_artist (artist),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 비트맵 (난이도별 채보) 테이블
CREATE TABLE beatmaps (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    song_id CHAR(36) NOT NULL,
    difficulty_name VARCHAR(20) NOT NULL COMMENT '난이도 이름 (EASY, NORMAL, HARD, MAXIMUM)',
    difficulty_level INT NOT NULL COMMENT '난이도 레벨 (1-15)',
    key_count ENUM('4', '5', '6', '8') NOT NULL COMMENT '버튼 수 (4K, 5K, 6K, 8K)',
    note_count INT NOT NULL COMMENT '총 노트 수',
    max_combo INT NOT NULL COMMENT '최대 콤보',
    note_speed DECIMAL(4, 2) DEFAULT 5.0 COMMENT '기본 노트 속도',
    notes_data JSON NOT NULL COMMENT '노트 데이터 (타이밍, 레인, 타입)',
    created_by CHAR(36) NULL COMMENT '제작자 (관리자 ID)',
    status ENUM('ACTIVE', 'TESTING', 'HIDDEN') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
    UNIQUE KEY uk_song_difficulty_key (song_id, difficulty_name, key_count),
    INDEX idx_song (song_id),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_key_count (key_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 플레이 기록 테이블
CREATE TABLE play_records (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    beatmap_id CHAR(36) NOT NULL,
    score INT NOT NULL COMMENT '점수 (0-1000000)',
    accuracy DECIMAL(5, 2) NOT NULL COMMENT '정확도 (%)',
    max_combo INT NOT NULL COMMENT '최대 콤보',
    perfect_count INT DEFAULT 0 COMMENT 'PERFECT 판정 수',
    great_count INT DEFAULT 0 COMMENT 'GREAT 판정 수',
    good_count INT DEFAULT 0 COMMENT 'GOOD 판정 수',
    bad_count INT DEFAULT 0 COMMENT 'BAD 판정 수',
    miss_count INT DEFAULT 0 COMMENT 'MISS 판정 수',
    rank ENUM('SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'F') NOT NULL COMMENT '등급',
    is_full_combo BOOLEAN DEFAULT FALSE COMMENT '풀콤보 여부',
    is_all_perfect BOOLEAN DEFAULT FALSE COMMENT '올퍼펙트 여부',
    note_speed DECIMAL(4, 2) DEFAULT 5.0 COMMENT '플레이 시 노트 속도',
    play_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (beatmap_id) REFERENCES beatmaps(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_beatmap (beatmap_id),
    INDEX idx_score (score DESC),
    INDEX idx_play_date (play_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 최고 기록 테이블 (사용자별 비트맵별 최고 점수만 저장)
CREATE TABLE best_scores (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    beatmap_id CHAR(36) NOT NULL,
    play_record_id CHAR(36) NOT NULL COMMENT '최고 기록의 play_records ID',
    score INT NOT NULL,
    accuracy DECIMAL(5, 2) NOT NULL,
    max_combo INT NOT NULL,
    rank ENUM('SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'F') NOT NULL,
    is_full_combo BOOLEAN DEFAULT FALSE,
    is_all_perfect BOOLEAN DEFAULT FALSE,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (beatmap_id) REFERENCES beatmaps(id) ON DELETE CASCADE,
    FOREIGN KEY (play_record_id) REFERENCES play_records(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_beatmap (user_id, beatmap_id),
    INDEX idx_beatmap_score (beatmap_id, score DESC),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 글로벌 랭킹 (전체 랭킹)
CREATE TABLE global_rankings (
    rank_position INT NOT NULL,
    user_id CHAR(36) NOT NULL,
    total_score BIGINT NOT NULL,
    total_plays INT NOT NULL,
    average_accuracy DECIMAL(5, 2) DEFAULT 0,
    full_combo_count INT DEFAULT 0,
    all_perfect_count INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (rank_position),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user (user_id),
    INDEX idx_total_score (total_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 비트맵별 랭킹 (곡별 랭킹)
CREATE TABLE beatmap_rankings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    beatmap_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    rank_position INT NOT NULL,
    score INT NOT NULL,
    accuracy DECIMAL(5, 2) NOT NULL,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (beatmap_id) REFERENCES beatmaps(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_beatmap_user (beatmap_id, user_id),
    INDEX idx_beatmap_rank (beatmap_id, rank_position),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 업적 테이블
CREATE TABLE achievements (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL COMMENT '업적 이름',
    description TEXT NOT NULL COMMENT '업적 설명',
    icon_url VARCHAR(500) NULL,
    condition_type ENUM('SCORE', 'COMBO', 'ACCURACY', 'PLAYS', 'FULL_COMBO', 'ALL_PERFECT') NOT NULL,
    condition_value INT NOT NULL COMMENT '달성 조건 값',
    reward_exp INT DEFAULT 0 COMMENT '보상 경험치',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (condition_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자 업적 테이블
CREATE TABLE user_achievements (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    achievement_id CHAR(36) NOT NULL,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_achievement (user_id, achievement_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자 설정 테이블
CREATE TABLE user_settings (
    user_id CHAR(36) PRIMARY KEY,
    default_note_speed DECIMAL(4, 2) DEFAULT 5.0 COMMENT '기본 노트 속도',
    key_bindings JSON NULL COMMENT '키 바인딩 설정',
    visual_settings JSON NULL COMMENT '시각 설정 (기어 스킨, 노트 스킨)',
    audio_settings JSON NULL COMMENT '오디오 설정 (볼륨, 오프셋)',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 관리자 계정 생성 (비밀번호: admin123)
INSERT INTO admins (username, password, role) VALUES
('admin', '$2b$10$YourHashedPasswordHere', 'SUPER_ADMIN');

-- 샘플 노래 데이터
INSERT INTO songs (title, artist, bpm, duration, audio_file_path, genre) VALUES
('First Song', 'Sample Artist', 140.00, 120, '/audio/sample.mp3', 'Electronic'),
('Second Song', 'Another Artist', 160.00, 150, '/audio/sample2.mp3', 'Trance');

-- 샘플 업적
INSERT INTO achievements (name, description, condition_type, condition_value, reward_exp) VALUES
('첫 플레이', '첫 곡을 플레이하세요', 'PLAYS', 1, 100),
('콤보 마스터', '100 콤보를 달성하세요', 'COMBO', 100, 500),
('완벽주의자', '풀콤보를 달성하세요', 'FULL_COMBO', 1, 1000),
('신의 경지', '올퍼펙트를 달성하세요', 'ALL_PERFECT', 1, 5000);
