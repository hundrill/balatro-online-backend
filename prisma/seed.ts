import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // GameSetting 초기 데이터 삽입
    console.log('📝 Inserting game settings...');

    const gameSettings = [
        {
            id: 'discard_remaining_funds',
            name: 'discardRemainingFunds',
            value: '50', // 버리기 남은 횟수에 따른 지급 funds 값 (단일 고정값)
            description: '버리기 남은 횟수에 따른 지급 funds 값',
            isActive: true,
        },
        // 라운드별 유저 등수에 따른 지급 funds 설정
        {
            id: 'round_rank_funds',
            name: 'roundRankFunds',
            value: JSON.stringify({
                "1": { "1": 100, "2": 50, "3": 25, "4": 10 },  // 1라운드: 1등 100, 2등 50, 3등 25, 4등 10
                "2": { "1": 150, "2": 75, "3": 40, "4": 15 },  // 2라운드: 1등 150, 2등 75, 3등 40, 4등 15
                "3": { "1": 200, "2": 100, "3": 50, "4": 20 }, // 3라운드: 1등 200, 2등 100, 3등 50, 4등 20
                "4": { "1": 250, "2": 125, "3": 60, "4": 25 }, // 4라운드: 1등 250, 2등 125, 3등 60, 4등 25
                "5": { "1": 300, "2": 150, "3": 75, "4": 30 }  // 5라운드: 1등 300, 2등 150, 3등 75, 4등 30
            }),
            description: '라운드별 유저 등수에 따른 지급 funds 설정',
            isActive: true,
        },
    ];

    for (const setting of gameSettings) {
        try {
            await prisma.gameSetting.upsert({
                where: { id: setting.id },
                update: {
                    value: setting.value,
                    description: setting.description,
                    isActive: setting.isActive,
                },
                create: {
                    id: setting.id,
                    name: setting.name,
                    value: setting.value,
                    description: setting.description,
                    isActive: setting.isActive,
                },
            });
            console.log(`✅ Game setting "${setting.name}" upserted`);
        } catch (error) {
            console.error(`❌ Failed to upsert game setting "${setting.name}":`, error);
        }
    }

    console.log('🎉 Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 