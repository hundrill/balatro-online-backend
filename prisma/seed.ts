import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = '1111';
    const passwordHash = await bcrypt.hash(password, 10);

    // 기존 테스트 사용자
    await prisma.user.upsert({
        where: { email: 'hundrill@naver.com' },
        update: {},
        create: {
            email: 'hundrill@naver.com',
            passwordHash,
            nickname: 'hundrill',
        },
    });
    console.log('Test user created: hundrill@naver.com');

    // compass1@test.com ~ compass19@test.com 생성
    for (let i = 1; i <= 19; i++) {
        const email = `compass${i}@test.com`;
        const nickname = `컴파스${i}`;

        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                passwordHash,
                nickname,
            },
        });
        console.log(`Test user created: ${email} (${nickname})`);
    }

    console.log('All test users created successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 