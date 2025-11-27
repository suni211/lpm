-- Rhythm Game Database Schema

CREATE DATABASE IF NOT EXISTS rhythm_game;
USE rhythm_game;

-- 유저 테이블
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    display_name VARCHAR(50),
    tier VARCHAR(20) DEFAULT 'HAMGU',
    rating INT DEFAULT 1000,
    total_plays INT DEFAULT 0,
    total_score BIGINT DEFAULT 0,
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tier (tier),
    INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 곡 테이블
CREATE TABLE IF NOT EXISTS songs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(200) NOT NULL,
    audio_file VARCHAR(255) NOT NULL,
    cover_image VARCHAR(255),
    duration INT NOT NULL,
    bpm DECIMAL(6,2),
    creator_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_title (title),
    INDEX idx_artist (artist)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 비트맵 테이블
CREATE TABLE IF NOT EXISTS beatmaps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    song_id INT NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    key_count INT NOT NULL,
    note_data LONGTEXT NOT NULL,
    effect_data LONGTEXT,
    creator_id INT,
    total_notes INT DEFAULT 0,
    max_combo INT DEFAULT 0,
    level INT DEFAULT 1,
    is_ranked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_difficulty (difficulty),
    INDEX idx_key_count (key_count),
    INDEX idx_ranked (is_ranked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 스코어 테이블
CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    beatmap_id INT NOT NULL,
    score BIGINT NOT NULL,
    accuracy DECIMAL(5,2) NOT NULL,
    max_combo INT NOT NULL,
    count_yas INT DEFAULT 0,
    count_oh INT DEFAULT 0,
    count_ah INT DEFAULT 0,
    count_fuck INT DEFAULT 0,
    mods VARCHAR(50),
    play_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (beatmap_id) REFERENCES beatmaps(id) ON DELETE CASCADE,
    INDEX idx_user_beatmap (user_id, beatmap_id),
    INDEX idx_score (score DESC),
    INDEX idx_play_date (play_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 매칭 큐 테이블
CREATE TABLE IF NOT EXISTS match_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tier VARCHAR(20) NOT NULL,
    rating INT NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tier_rating (tier, rating),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 매치 테이블
CREATE TABLE IF NOT EXISTS matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    current_round INT DEFAULT 1,
    max_rounds INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 매치 참가자 테이블
CREATE TABLE IF NOT EXISTS match_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    user_id INT NOT NULL,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    total_score BIGINT DEFAULT 0,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_match_user (match_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 매치 라운드 테이블
CREATE TABLE IF NOT EXISTS match_rounds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    round_number INT NOT NULL,
    beatmap_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (beatmap_id) REFERENCES beatmaps(id) ON DELETE CASCADE,
    INDEX idx_match_round (match_id, round_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 밴픽 테이블
CREATE TABLE IF NOT EXISTS match_bans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    user_id INT NOT NULL,
    beatmap_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (beatmap_id) REFERENCES beatmaps(id) ON DELETE CASCADE,
    UNIQUE KEY unique_match_beatmap (match_id, beatmap_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 이모티콘 테이블
CREATE TABLE IF NOT EXISTS emoticons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    uploader_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 유저 설정 테이블
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INT PRIMARY KEY,
    display_sync INT DEFAULT 0,
    note_speed DECIMAL(3,1) DEFAULT 1.0,
    playback_speed DECIMAL(3,1) DEFAULT 1.0,
    note_skin VARCHAR(50) DEFAULT 'default',
    key_bindings JSON,
    auto_offset INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 통계 테이블
CREATE TABLE IF NOT EXISTS user_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    plays_count INT DEFAULT 0,
    total_score BIGINT DEFAULT 0,
    avg_accuracy DECIMAL(5,2) DEFAULT 0,
    peak_combo INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 친구 관계 테이블
CREATE TABLE IF NOT EXISTS friendships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_friendship (user_id, friend_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 이모티콘 삽입
INSERT INTO emoticons (name, image_url, is_custom) VALUES
('perfect', '/assets/emoticons/perfect.png', FALSE),
('nice', '/assets/emoticons/nice.png', FALSE),
('oops', '/assets/emoticons/oops.png', FALSE),
('rage', '/assets/emoticons/rage.png', FALSE),
('love', '/assets/emoticons/love.png', FALSE);
