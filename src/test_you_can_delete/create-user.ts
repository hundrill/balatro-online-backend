import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const userId = 'aaaa@naver.com';
    const password = '1111';
    const nickname = 'aaaa';

    // 비밀번호 해시 생성
    const passwordHash = await bcrypt.hash(password, 10);

    // 이미 존재하는지 확인
    const exists = await prisma.user.findUnique({ where: { userId } });
    if (exists) {
        console.log('이미 해당 이메일의 유저가 존재합니다:', userId);
        return;
    }

    // 유저 생성
    const user = await prisma.user.create({
        data: {
            userId,
            passwordHash,
            nickname,
        },
    });
    console.log('유저 생성 완료:', user);
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
