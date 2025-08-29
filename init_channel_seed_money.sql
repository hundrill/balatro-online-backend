-- 채널별 씨드머니 기본값 설정
INSERT INTO GameSetting (id, name, value, isActive, createdAt, updatedAt)
VALUES (
    UUID(),
    'channelSeedMoney',
    '{
        "beginner": {"seedMoney1": 15, "seedMoney2": 30, "seedMoney3": 60, "seedMoney4": 90},
        "intermediate": {"seedMoney1": 120, "seedMoney2": 180, "seedMoney3": 240, "seedMoney4": 300},
        "advanced": {"seedMoney1": 420, "seedMoney2": 540, "seedMoney3": 660, "seedMoney4": 780},
        "expert": {"seedMoney1": 990, "seedMoney2": 1200, "seedMoney3": 1410, "seedMoney4": 1620},
        "royal": {"seedMoney1": 2100, "seedMoney2": 2100, "seedMoney3": 2100, "seedMoney4": 2100}
    }',
    true,
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    value = VALUES(value),
    updatedAt = NOW();

-- 설정 확인
SELECT name, value FROM GameSetting WHERE name = 'channelSeedMoney'; 