import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findByUserId(userId: string) {
    return this.prisma.user.findUnique({ where: { userId } });
  }

  async create(data: {
    userId: string;
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
      where: { userId: userId },
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

  /**
   * 유저의 칩 정보를 DB에 저장합니다.
   */
  async saveUserChips(userId: string, silverChip: number, goldChip: number) {
    try {
      await this.prisma.user.update({
        where: { userId: userId },
        data: {
          silverChip: silverChip,
          goldChip: goldChip,
        },
      });
      return true;
    } catch (error) {
      console.error(`[UserService] saveUserChips 오류: userId=${userId}`, error);
      return false;
    }
  }
}
