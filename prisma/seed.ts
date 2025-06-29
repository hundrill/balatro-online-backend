import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = '1111';
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
        where: { email: 'hundrill@naver.com' },
        update: {},
        create: {
            email: 'hundrill@naver.com',
            passwordHash,
            nickname: 'hundrill',
        },
    });
    console.log('Test user created.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 