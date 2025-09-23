import { Controller, Get, Post, UseGuards, Request, Logger, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChallengeService } from './challenge.service';
import { ChallengeStatusResponseDto, ChallengeStatusDataDto } from './dto/challenge-status-response.dto';
import { ChallengeClaimRequestDto } from './dto/challenge-claim-request.dto';
import { ChallengeClaimResponseDto } from './dto/challenge-claim-response.dto';
import { ChallengeUpdateRequestDto } from './dto/challenge-update-request.dto';
import { ChallengeUpdateResponseDto } from './dto/challenge-update-response.dto';


@Controller('challenge')
export class ChallengeController {
    private readonly logger = new Logger(ChallengeController.name);

    constructor(private challengeService: ChallengeService) { }

    @Get('user-status')
    @UseGuards(JwtAuthGuard)
    async getUserChallengeStatus(@Request() req: any): Promise<ChallengeStatusResponseDto> {
        try {
            const userId = req.user.userId;
            const userProgress = await this.challengeService.getUserChallengeProgress(userId);

            const challenges: ChallengeStatusDataDto[] = Array.from(userProgress.entries())
                .filter(([id, data]) => !data.isCompleted)
                .map(([id, data]) => ({
                    id,
                    currentCount: data.currentCount,
                    isCompleted: data.isCompleted
                }));

            this.logger.log(`[ChallengeController] 사용자 챌린지 상태 조회: userId=${userId}, challenges=${challenges.length}개`);

            return { success: true, code: 0, message: '사용자 챌린지 상태 조회 성공', challenges };
        } catch (error) {
            this.logger.error(`[ChallengeController] 사용자 챌린지 상태 조회 실패: userId=${req.user?.userId}`, error);
            return { success: false, code: 1, message: '사용자 챌린지 상태 조회 실패', challenges: [] };
        }
    }

    @Post('claim')
    @UseGuards(JwtAuthGuard)
    async claimChallengeReward(@Request() req: any, @Body() body: ChallengeClaimRequestDto): Promise<ChallengeClaimResponseDto> {
        try {
            const userId = req.user.userId;
            const { challengeId } = body;

            const result = await this.challengeService.claimChallengeReward(userId, challengeId);

            this.logger.log(`[ChallengeController] 챌린지 보상 수령 요청: userId=${userId}, challengeId=${challengeId}, success=${result.success}`);

            return {
                success: result.success,
                code: result.success ? 200 : 400,
                message: result.message,
                reward: result.reward,
                goldChip: result.goldChip,
                silverChip: result.silverChip
            };
        } catch (error) {
            this.logger.error(`[ChallengeController] 챌린지 보상 수령 실패: userId=${req.user?.userId}, challengeId=${body.challengeId}`, error);
            return {
                success: false,
                code: 500,
                message: '서버 오류가 발생했습니다.'
            };
        }
    }

    @Post('update')
    @UseGuards(JwtAuthGuard)
    async updateChallengeProgress(@Request() req: any, @Body() body: ChallengeUpdateRequestDto): Promise<ChallengeUpdateResponseDto> {
        try {
            const userId = req.user.userId;
            const { challengeId } = body;

            const result = await this.challengeService.updateChallengeProgressOnly(userId, challengeId, 1);

            this.logger.log(`[ChallengeController] 챌린지 진행도 업데이트 요청: userId=${userId}, challengeId=${challengeId}, success=${result.success}`);

            return {
                success: result.success,
                code: result.success ? 200 : 400,
                message: result.message
            };
        } catch (error) {
            this.logger.error(`[ChallengeController] 챌린지 진행도 업데이트 실패: userId=${req.user?.userId}, challengeId=${body.challengeId}`, error);
            return {
                success: false,
                code: 500,
                message: '서버 오류가 발생했습니다.'
            };
        }
    }
}
