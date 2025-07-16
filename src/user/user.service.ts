import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    nickname: string;
  }) {
    return this.prisma.user.create({ data });
  }

  /**
   * 유저의 칩 정보를 가져옵니다.
   */
  async getUserChips(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: userId },
      select: {
        silverChip: true,
        goldChip: true,
      },
    });

    if (!user) {
      return { silverChip: 0, goldChip: 0 };
    }

    return {
      silverChip: user.silverChip || 0,
      goldChip: user.goldChip || 0,
    };
  }
}
