import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PiggyBankResponseDto } from './dto/piggybank-response.dto';
import { PiggyBankClaimRequestDto } from './dto/piggybank-claim-request.dto';
import { PiggyBankClaimResponseDto } from './dto/piggybank-claim-response.dto';

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

  /**
   * 유저의 피그뱅크 정보를 가져옵니다.
   */
  async getPiggyBank(userId: string): Promise<PiggyBankResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { userId: userId },
      select: {
        silverChip: true,
        piggyBankClaimCount: true,
      },
    });

    if (!user) {
      return { silverCoin: 0, claimCount: 0, claimMaxCount: 5 };
    }

    return {
      silverCoin: user.silverChip || 0,
      claimCount: user.piggyBankClaimCount || 0,
      claimMaxCount: 5,
    };
  }

  /**
   * 피그뱅크 수령 처리
   */
  async claimPiggyBank(userId: string, claimRequest: PiggyBankClaimRequestDto): Promise<PiggyBankClaimResponseDto> {
    try {
      // 유저 정보 조회
      const user = await this.prisma.user.findUnique({
        where: { userId: userId },
        select: {
          silverChip: true,
          goldChip: true,
          piggyBankClaimCount: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          silverChip: 0,
          claimCount: 0,
          goldChip: 0,
        };
      }

      // 실버칩 100 미만 체크
      if (user.silverChip < 100) {
        return {
          success: false,
          message: 'Insufficient silver chips (minimum 100 required)',
          silverChip: user.silverChip,
          claimCount: user.piggyBankClaimCount || 0,
          goldChip: user.goldChip,
        };
      }

      // 최대 수령 횟수 체크
      if ((user.piggyBankClaimCount || 0) >= 5) {
        return {
          success: false,
          message: 'Maximum claim count exceeded',
          silverChip: user.silverChip,
          claimCount: user.piggyBankClaimCount || 0,
          goldChip: user.goldChip,
        };
      }

      // 실버칩 100 차감, 골드칩 100 증가, 수령 횟수 증가
      const updatedUser = await this.prisma.user.update({
        where: { userId: userId },
        data: {
          silverChip: user.silverChip - 100,
          goldChip: user.goldChip + 100,
          piggyBankClaimCount: (user.piggyBankClaimCount || 0) + 1,
        },
      });

      return {
        success: true,
        message: 'Piggy bank claimed successfully',
        silverChip: updatedUser.silverChip,
        claimCount: updatedUser.piggyBankClaimCount || 0,
        goldChip: updatedUser.goldChip,
      };

    } catch (error) {
      console.error(`[UserService] claimPiggyBank 오류: userId=${userId}`, error);
      return {
        success: false,
        message: 'Internal server error',
        silverChip: 0,
        claimCount: 0,
        goldChip: 0,
      };
    }
  }
}
