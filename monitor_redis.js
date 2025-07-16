const Redis = require('ioredis');

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
});

console.log('🔍 Redis 연결 상태 모니터링 시작...\n');

// 현재 접속 중인 유저 확인
async function checkConnectedUsers() {
    try {
        const keys = await redis.keys('channel_member:*');

        if (keys.length === 0) {
            console.log('📭 현재 접속 중인 유저: 없음');
        } else {
            console.log(`👥 현재 접속 중인 유저: ${keys.length}명`);

            for (const key of keys) {
                const userId = key.replace('channel_member:', '');
                const userData = await redis.get(key);

                if (userData) {
                    const data = JSON.parse(userData);
                    const connectedAt = new Date(data.connectedAt);
                    const now = new Date();
                    const duration = Math.floor((now - connectedAt) / 1000); // 초 단위

                    console.log(`  - ${userId} (접속시간: ${duration}초 전)`);
                }
            }
        }

        // TTL 정보도 확인
        for (const key of keys) {
            const ttl = await redis.ttl(key);
            if (ttl > 0) {
                console.log(`  ⏰ ${key}: ${ttl}초 후 만료`);
            }
        }

    } catch (error) {
        console.error('❌ Redis 조회 오류:', error);
    }
}

// 5초마다 상태 확인
setInterval(checkConnectedUsers, 5000);

// 초기 확인
checkConnectedUsers();

// 종료 처리
process.on('SIGINT', async () => {
    console.log('\n🛑 모니터링 종료...');
    await redis.quit();
    process.exit(0);
}); 