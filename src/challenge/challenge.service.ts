import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChallengeManagerService } from './challenge-manager.service';
import { ChallengeData } from './challenge-data.interface';

@Injectable()
export class ChallengeService {
    private readonly logger = new Logger(ChallengeService.name);

    constructor(
        private prisma: PrismaService,
        private challengeManagerService: ChallengeManagerService
    ) { }

    async updateChallengeProgress(userId: string, challengeId: string, increment: number = 1): Promise<void> {
        try {
            const currentProgress = await this.getUserChallengeProgress(userId);
            const currentData = currentProgress.get(challengeId) || { currentCount: 0, isCompleted: false };
            const newCount = currentData.currentCount + increment;

            const challenge = this.challengeManagerService.getChallenge(challengeId);
            const isCompleted = challenge ? newCount >= challenge.targetCount : false;

            currentProgress.set(challengeId, { currentCount: newCount, isCompleted });
            const progressString = this.serializeChallengeProgress(currentProgress);

            await this.prisma.user.update({
                where: { userId },
                data: { challengeProgress: progressString }
            });

            this.logger.log(`[ChallengeService] 챌린지 진행도 업데이트: userId=${userId}, challengeId=${challengeId}, count=${newCount}, completed=${isCompleted}`);
        } catch (error) {
            this.logger.error(`[ChallengeService] 챌린지 진행도 업데이트 실패: userId=${userId}, challengeId=${challengeId}`, error);
        }
    }

    async getUserChallengeProgress(userId: string): Promise<Map<string, { currentCount: number, isCompleted: boolean }>> {
        try {
            const user = await this.prisma.user.findUnique({
                where: { userId },
                select: { challengeProgress: true }
            });

            return this.parseChallengeProgress(user?.challengeProgress || "");
        } catch (error) {
            this.logger.error(`[ChallengeService] 사용자 챌린지 진행도 조회 실패: userId=${userId}`, error);
            return new Map();
        }
    }

    async getUserChallengesWithProgress(userId: string): Promise<ChallengeData[]> {
        try {
            const userProgress = await this.getUserChallengeProgress(userId);
            const allChallenges = this.challengeManagerService.getAllChallenges();

            return allChallenges.map(challenge => {
                const progressData = userProgress.get(challenge.id) || { currentCount: 0, isCompleted: false };
                return {
                    ...challenge,
                    currentCount: progressData.currentCount
                };
            });
        } catch (error) {
            this.logger.error(`[ChallengeService] 사용자 챌린지 진행도 조회 실패: userId=${userId}`, error);
            return [];
        }
    }

    async checkChallengeCompletion(userId: string, challengeId: string): Promise<boolean> {
        try {
            const userProgress = await this.getUserChallengeProgress(userId);
            const progressData = userProgress.get(challengeId);

            return progressData ? progressData.isCompleted : false;
        } catch (error) {
            this.logger.error(`[ChallengeService] 챌린지 달성 체크 실패: userId=${userId}, challengeId=${challengeId}`, error);
            return false;
        }
    }

    async notifyChallengeCompletion(userId: string, challengeId: string): Promise<void> {
        try {
            const challenge = this.challengeManagerService.getChallenge(challengeId);
            if (!challenge) {
                return;
            }

            this.logger.log(`[ChallengeService] 챌린지 달성: userId=${userId}, challengeId=${challengeId}, name=${challenge.nameKo}`);

            // TODO: 클라이언트에 알림 전송 로직 추가
        } catch (error) {
            this.logger.error(`[ChallengeService] 챌린지 달성 알림 실패: userId=${userId}, challengeId=${challengeId}`, error);
        }
    }

    async updateAndCheckCompletion(userId: string, challengeId: string, increment: number = 1): Promise<boolean> {
        await this.updateChallengeProgress(userId, challengeId, increment);
        const isCompleted = await this.checkChallengeCompletion(userId, challengeId);

        if (isCompleted) {
            await this.notifyChallengeCompletion(userId, challengeId);
        }

        return isCompleted;
    }

    async claimChallengeReward(userId: string, challengeId: string): Promise<{ success: boolean; message: string; reward?: number; goldChip?: number; silverChip?: number }> {
        try {
            const challenge = this.challengeManagerService.getChallenge(challengeId);
            if (!challenge) {
                return { success: false, message: '챌린지를 찾을 수 없습니다.' };
            }

            const userProgress = await this.getUserChallengeProgress(userId);
            const progressData = userProgress.get(challengeId);

            if (!progressData) {
                return { success: false, message: '챌린지 진행도가 없습니다.' };
            }

            if (progressData.currentCount < challenge.targetCount) {
                return { success: false, message: '챌린지가 아직 완료되지 않았습니다.' };
            }

            if (progressData.isCompleted) {
                return { success: false, message: '이미 보상을 수령했습니다.' };
            }

            // if (!challenge.reward) {
            //     return { success: false, message: '보상이 설정되지 않았습니다.' };
            // }

            const user = await this.prisma.user.findUnique({
                where: { userId },
                select: { goldChip: true, silverChip: true }
            });

            if (!user) {
                return { success: false, message: '사용자를 찾을 수 없습니다.' };
            }

            const newGoldChip = user.goldChip + (challenge.reward || 0);

            progressData.isCompleted = true;
            userProgress.set(challengeId, progressData);
            const progressString = this.serializeChallengeProgress(userProgress);

            await this.prisma.user.update({
                where: { userId },
                data: {
                    challengeProgress: progressString,
                    goldChip: newGoldChip
                }
            });

            // ResetChallengeWithAds 보상 수령 시 다른 챌린지들 리셋
            if (challengeId === 'ResetChallengeWithAds') {
                await this.resetAllChallengesExceptReset(userId, userProgress);
            } else {
                // 모든 챌린지 완료 확인 및 ResetChallengeWithAds 추가
                await this.checkAndAddResetChallenge(userId, userProgress);
            }

            this.logger.log(`[ChallengeService] 챌린지 보상 수령: userId=${userId}, challengeId=${challengeId}, reward=${challenge.reward}, newGoldChip=${newGoldChip}`);

            return {
                success: true,
                message: '보상을 성공적으로 수령했습니다.',
                reward: challenge.reward,
                goldChip: newGoldChip,
                silverChip: user.silverChip
            };
        } catch (error) {
            this.logger.error(`[ChallengeService] 챌린지 보상 수령 실패: userId=${userId}, challengeId=${challengeId}`, error);
            return { success: false, message: '보상 수령 중 오류가 발생했습니다.' };
        }
    }

    async updateChallengeProgressOnly(userId: string, challengeId: string, increment: number = 1): Promise<{ success: boolean; message: string }> {
        try {
            const challenge = this.challengeManagerService.getChallenge(challengeId);
            if (!challenge) {
                return { success: false, message: '챌린지를 찾을 수 없습니다.' };
            }

            const currentProgress = await this.getUserChallengeProgress(userId);
            const currentData = currentProgress.get(challengeId) || { currentCount: 0, isCompleted: false };
            const newCount = currentData.currentCount + increment;

            currentProgress.set(challengeId, { currentCount: newCount, isCompleted: currentData.isCompleted });
            const progressString = this.serializeChallengeProgress(currentProgress);

            await this.prisma.user.update({
                where: { userId },
                data: { challengeProgress: progressString }
            });

            this.logger.log(`[ChallengeService] 챌린지 진행도 업데이트: userId=${userId}, challengeId=${challengeId}, count=${newCount}`);

            return { success: true, message: '챌린지 진행도가 업데이트되었습니다.' };
        } catch (error) {
            this.logger.error(`[ChallengeService] 챌린지 진행도 업데이트 실패: userId=${userId}, challengeId=${challengeId}`, error);
            return { success: false, message: '챌린지 진행도 업데이트 중 오류가 발생했습니다.' };
        }
    }

    private async checkAndAddResetChallenge(userId: string, userProgress: Map<string, { currentCount: number, isCompleted: boolean }>): Promise<void> {
        try {
            const resetChallengeId = 'ResetChallengeWithAds';

            // ResetChallengeWithAds가 이미 있는지 확인
            if (userProgress.has(resetChallengeId)) {
                return;
            }

            // userProgress에 있는 모든 챌린지가 완료되었는지 확인
            let allCompleted = true;
            for (const [challengeId, progressData] of userProgress.entries()) {
                if (challengeId === resetChallengeId) continue; // ResetChallengeWithAds는 제외

                if (!progressData.isCompleted) {
                    allCompleted = false;
                    break;
                }
            }

            // 모든 챌린지가 완료되었으면 ResetChallengeWithAds 추가
            if (allCompleted) {
                userProgress.set(resetChallengeId, { currentCount: 0, isCompleted: false });
                const progressString = this.serializeChallengeProgress(userProgress);

                await this.prisma.user.update({
                    where: { userId },
                    data: { challengeProgress: progressString }
                });

                this.logger.log(`[ChallengeService] 모든 챌린지 완료로 ResetChallengeWithAds 추가: userId=${userId}`);
            }
        } catch (error) {
            this.logger.error(`[ChallengeService] ResetChallengeWithAds 추가 실패: userId=${userId}`, error);
        }
    }

    private async resetAllChallengesExceptReset(userId: string, userProgress: Map<string, { currentCount: number, isCompleted: boolean }>): Promise<void> {
        try {
            const resetChallengeId = 'ResetChallengeWithAds';

            // ResetChallengeWithAds를 제외한 모든 챌린지 리셋
            for (const [challengeId, progressData] of userProgress.entries()) {
                if (challengeId !== resetChallengeId) {
                    userProgress.set(challengeId, { currentCount: 0, isCompleted: false });
                }
            }

            const progressString = this.serializeChallengeProgress(userProgress);

            await this.prisma.user.update({
                where: { userId },
                data: { challengeProgress: progressString }
            });

            this.logger.log(`[ChallengeService] ResetChallengeWithAds 보상 수령으로 다른 챌린지들 리셋: userId=${userId}`);
        } catch (error) {
            this.logger.error(`[ChallengeService] 챌린지 리셋 실패: userId=${userId}`, error);
        }
    }

    private parseChallengeProgress(progressString: string): Map<string, { currentCount: number, isCompleted: boolean }> {
        const progressMap = new Map<string, { currentCount: number, isCompleted: boolean }>();
        if (!progressString) return progressMap;

        progressString.split(',').forEach(pair => {
            const parts = pair.split(':');
            if (parts.length >= 2) {
                const challengeId = parts[0];
                const currentCount = parseInt(parts[1]);
                const isCompleted = parts.length >= 3 ? parts[2] === 'true' : false;

                if (challengeId && !isNaN(currentCount)) {
                    progressMap.set(challengeId, { currentCount, isCompleted });
                }
            }
        });

        return progressMap;
    }

    private serializeChallengeProgress(progressMap: Map<string, { currentCount: number, isCompleted: boolean }>): string {
        return Array.from(progressMap.entries())
            .map(([id, data]) => `${id}:${data.currentCount}:${data.isCompleted}`)
            .join(',');
    }
}
