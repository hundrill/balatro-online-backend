import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChallengeData } from './challenge-data.interface';

@Injectable()
export class ChallengeManagerService {
    private readonly logger = new Logger(ChallengeManagerService.name);
    private challenges: Map<string, ChallengeData> = new Map();

    constructor(private prisma: PrismaService) {
        // 생성자에서는 초기화하지 않음 (AppService에서 initializeChallenges 호출)
    }

    async loadChallenges(): Promise<void> {
        try {
            this.logger.log('[ChallengeManagerService] DB에서 챌린지 데이터 로드 시작...');

            const challenges = await this.prisma.challenge.findMany({
                where: { isActive: true }
            });

            if (challenges.length === 0) {
                this.logger.log('[ChallengeManagerService] DB에 챌린지 데이터가 없습니다.');
                return;
            }

            let updatedCount = 0;
            for (const challenge of challenges) {
                const challengeData: ChallengeData = {
                    id: challenge.id,
                    nameKo: challenge.nameKo,
                    nameEn: challenge.nameEn,
                    nameId: challenge.nameId,
                    descriptionKo: challenge.descriptionKo || undefined,
                    descriptionEn: challenge.descriptionEn || undefined,
                    descriptionId: challenge.descriptionId || undefined,
                    targetCount: challenge.targetCount,
                    reward: challenge.reward || undefined,
                    currentCount: 0
                };

                this.challenges.set(challenge.id, challengeData);
                updatedCount++;
            }

            this.logger.log(`[ChallengeManagerService] DB에서 ${updatedCount}개의 챌린지 데이터를 로드하여 메모리를 업데이트했습니다.`);
        } catch (error) {
            this.logger.error('[ChallengeManagerService] DB에서 챌린지 데이터 로드 실패:', error);
        }
    }

    getChallenge(challengeId: string): ChallengeData | undefined {
        return this.challenges.get(challengeId);
    }

    getAllChallenges(): ChallengeData[] {
        return Array.from(this.challenges.values());
    }

    getActiveChallenges(): ChallengeData[] {
        return Array.from(this.challenges.values()).filter(challenge => challenge.targetCount > 0);
    }

    async refreshChallenges(): Promise<void> {
        await this.loadChallenges();
    }

    getChallengeCount(): number {
        return this.challenges.size;
    }
}
