-- LICO 지갑 상태 확인 쿼리

USE lico_db;

-- 1. 특정 사용자의 지갑 존재 여부 확인
-- minecraft_username을 변경하여 사용하세요
SELECT 
    u.minecraft_username,
    CASE 
        WHEN w.id IS NULL THEN '지갑 없음'
        ELSE '지갑 있음'
    END AS wallet_status,
    w.wallet_address,
    COALESCE(w.address_shown, FALSE) AS '주소 표시 여부',
    w.recovery_words_hash IS NOT NULL AS '복구 단어 설정 여부',
    COALESCE(w.wallet_info_shown, FALSE) AS '안내 표시 여부',
    w.created_at AS '지갑 생성일'
FROM (
    SELECT DISTINCT minecraft_username 
    FROM lico_questionnaires
    WHERE minecraft_username = 'YOUR_USERNAME'  -- 여기에 확인할 사용자명 입력
) u
LEFT JOIN user_wallets w ON u.minecraft_username = w.minecraft_username;

-- 2. 설문조사 승인 여부 확인
SELECT 
    minecraft_username,
    total_score,
    is_approved AS '승인 여부',
    CASE 
        WHEN is_approved = TRUE THEN '✅ 승인됨 - 지갑 생성 가능'
        WHEN total_score >= 90 THEN '⚠️ 점수는 충분하지만 승인되지 않음'
        ELSE '❌ 미승인 - 90점 이상 필요'
    END AS status_message,
    created_at AS '설문조사 제출일'
FROM lico_questionnaires
WHERE minecraft_username = 'YOUR_USERNAME';  -- 여기에 확인할 사용자명 입력

-- 3. 지갑이 없는 사용자 목록 (설문조사는 승인됨)
SELECT 
    q.minecraft_username,
    q.total_score,
    q.is_approved,
    q.created_at AS '설문조사 제출일',
    '지갑 생성 필요' AS action
FROM lico_questionnaires q
LEFT JOIN user_wallets w ON q.minecraft_username = w.minecraft_username
WHERE q.is_approved = TRUE 
  AND w.id IS NULL
ORDER BY q.created_at DESC;

-- 4. 모든 사용자의 지갑 상태 요약
SELECT 
    COUNT(DISTINCT q.minecraft_username) AS '설문조사 완료 사용자',
    COUNT(DISTINCT CASE WHEN q.is_approved = TRUE THEN q.minecraft_username END) AS '설문조사 승인 사용자',
    COUNT(DISTINCT w.id) AS '지갑 보유 사용자',
    COUNT(DISTINCT CASE WHEN q.is_approved = TRUE AND w.id IS NULL THEN q.minecraft_username END) AS '승인되었지만 지갑 없음'
FROM lico_questionnaires q
LEFT JOIN user_wallets w ON q.minecraft_username = w.minecraft_username;

