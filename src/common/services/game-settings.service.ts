import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface GameSettings {
    discardRemainingFunds: number;
    roundRankFunds: {
        [round: number]: {
            [rank: number]: number;
        };
    };
    channelSeedMoney: {
        beginner: { seedMoney1: number, seedMoney2: number, seedMoney3: number, seedMoney4: number },
        intermediate: { seedMoney1: number, seedMoney2: number, seedMoney3: number, seedMoney4: number },
        advanced: { seedMoney1: number, seedMoney2: number, seedMoney3: number, seedMoney4: number },
        expert: { seedMoney1: number, seedMoney2: number, seedMoney3: number, seedMoney4: number },
        royal: { seedMoney1: number, seedMoney2: number, seedMoney3: number, seedMoney4: number }
    };
}

@Injectable()
export class GameSettingsService {
    private readonly logger = new Logger(GameSettingsService.name);
    private settingsCache: GameSettings | null = null;
    private lastCacheUpdate: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

    constructor(private readonly prisma: PrismaService) { }

    /**
     * 게임 설정을 가져옵니다. 캐시된 값이 있으면 사용하고, 없으면 DB에서 로드합니다.
     */
    async getGameSettings(): Promise<GameSettings> {
        const now = Date.now();

        // 캐시가 유효한지 확인
        if (this.settingsCache && (now - this.lastCacheUpdate) < this.CACHE_DURATION) {
            return this.settingsCache;
        }

        // DB에서 설정 로드
        await this.loadSettingsFromDatabase();
        return this.settingsCache!;
    }

    /**
     * 특정 설정값을 가져옵니다.
     */
    async getSetting<T>(key: keyof GameSettings): Promise<T> {
        const settings = await this.getGameSettings();
        return settings[key] as T;
    }

    /**
     * 버리기 남은 횟수에 따른 지급 funds 값을 가져옵니다.
     */
    async getDiscardRemainingFunds(): Promise<number> {
        return await this.getSetting<number>('discardRemainingFunds');
    }

    /**
     * 특정 라운드의 특정 등수에 대한 지급 funds 값을 가져옵니다.
     */
    async getRoundRankFunds(round: number, rank: number): Promise<number> {
        const roundRankFundsRaw = await this.getSetting<string>('roundRankFunds');
        // this.logger.log(`[GameSettings] getRoundRankFunds 호출: round=${round}, rank=${rank}`);
        // this.logger.log(`[GameSettings] 원본 roundRankFunds:`, roundRankFundsRaw);
        // this.logger.log(`[GameSettings] 원본 타입:`, typeof roundRankFundsRaw);

        const roundRankFunds = JSON.parse(roundRankFundsRaw);
        // this.logger.log(`[GameSettings] 파싱된 roundRankFunds:`, roundRankFunds);
        // this.logger.log(`[GameSettings] 파싱된 타입:`, typeof roundRankFunds);
        // this.logger.log(`[GameSettings] 파싱된 키들:`, Object.keys(roundRankFunds));
        // this.logger.log(`[GameSettings] 찾는 키: "${round.toString()}"`);
        // this.logger.log(`[GameSettings] 해당 라운드 데이터:`, roundRankFunds[round.toString()]);
        const result = roundRankFunds[round.toString()]?.[rank.toString()] || 0;
        this.logger.log(`[GameSettings] 최종 반환값: ${result}`);
        return result;
    }

    /**
     * 캐시를 무효화합니다. 설정이 변경될 때 호출됩니다.
     */
    async invalidateCache(): Promise<void> {
        this.settingsCache = null;
        this.lastCacheUpdate = 0;
        this.logger.log('[GameSettings] 캐시가 무효화되었습니다.');
    }

    /**
     * DB에서 설정을 로드하고 캐시에 저장합니다.
     */
    private async loadSettingsFromDatabase(): Promise<void> {
        try {
            const dbSettings = await this.prisma.gameSetting.findMany({
                where: { isActive: true },
            });

            const settings: GameSettings = {
                discardRemainingFunds: 50, // 기본값
                roundRankFunds: {
                    1: { 1: 100, 2: 50, 3: 25, 4: 10 },
                    2: { 1: 150, 2: 75, 3: 40, 4: 15 },
                    3: { 1: 200, 2: 100, 3: 50, 4: 20 },
                    4: { 1: 250, 2: 125, 3: 60, 4: 25 },
                    5: { 1: 300, 2: 150, 3: 75, 4: 30 },
                },
                channelSeedMoney: {
                    beginner: { seedMoney1: 15, seedMoney2: 30, seedMoney3: 60, seedMoney4: 90 },
                    intermediate: { seedMoney1: 120, seedMoney2: 180, seedMoney3: 240, seedMoney4: 300 },
                    advanced: { seedMoney1: 420, seedMoney2: 540, seedMoney3: 660, seedMoney4: 780 },
                    expert: { seedMoney1: 990, seedMoney2: 1200, seedMoney3: 1410, seedMoney4: 1620 },
                    royal: { seedMoney1: 2100, seedMoney2: 2100, seedMoney3: 2100, seedMoney4: 2100 }
                }
            };

            // DB 설정값으로 덮어쓰기
            dbSettings.forEach(setting => {
                try {
                    switch (setting.name) {
                        case 'discardRemainingFunds':
                            this.logger.log(`[GameSettings] discardRemainingFunds 파싱: setting.value="${setting.value}", type=${typeof setting.value}`);
                            const parsedValue = JSON.parse(setting.value);
                            this.logger.log(`[GameSettings] parsedValue=${parsedValue}, type=${typeof parsedValue}`);
                            settings.discardRemainingFunds = parsedValue || 50;
                            this.logger.log(`[GameSettings] 최종 설정값: ${settings.discardRemainingFunds}`);
                            break;
                        case 'roundRankFunds':
                            this.logger.log(`[GameSettings] roundRankFunds 파싱: setting.value="${setting.value}", type=${typeof setting.value}`);
                            const roundRankData = JSON.parse(setting.value);
                            this.logger.log(`[GameSettings] roundRankData:`, roundRankData);
                            settings.roundRankFunds = roundRankData;
                            this.logger.log(`[GameSettings] roundRankFunds 설정 완료`);
                            break;
                        case 'channelSeedMoney':
                            this.logger.log(`[GameSettings] channelSeedMoney 파싱: setting.value="${setting.value}", type=${typeof setting.value}`);
                            const channelSeedMoneyData = JSON.parse(setting.value);
                            this.logger.log(`[GameSettings] channelSeedMoneyData:`, channelSeedMoneyData);
                            settings.channelSeedMoney = channelSeedMoneyData;
                            this.logger.log(`[GameSettings] channelSeedMoney 설정 완료`);
                            break;
                    }
                } catch (error) {
                    this.logger.error(`[GameSettings] 설정 파싱 실패: ${setting.name}`, error);
                }
            });

            this.settingsCache = settings;
            this.lastCacheUpdate = Date.now();

            this.logger.log('[GameSettings] 설정이 DB에서 로드되었습니다.');
        } catch (error) {
            this.logger.error('[GameSettings] DB에서 설정 로드 실패:', error);
            // 에러 발생 시 기본값 사용
            this.settingsCache = {
                discardRemainingFunds: 50,
                roundRankFunds: {
                    1: { 1: 100, 2: 50, 3: 25, 4: 10 },
                    2: { 1: 150, 2: 75, 3: 40, 4: 15 },
                    3: { 1: 200, 2: 100, 3: 50, 4: 20 },
                    4: { 1: 250, 2: 125, 3: 60, 4: 25 },
                    5: { 1: 300, 2: 150, 3: 75, 4: 30 },
                },
                channelSeedMoney: {
                    beginner: { seedMoney1: 15, seedMoney2: 30, seedMoney3: 60, seedMoney4: 90 },
                    intermediate: { seedMoney1: 120, seedMoney2: 180, seedMoney3: 240, seedMoney4: 300 },
                    advanced: { seedMoney1: 420, seedMoney2: 540, seedMoney3: 660, seedMoney4: 780 },
                    expert: { seedMoney1: 990, seedMoney2: 1200, seedMoney3: 1410, seedMoney4: 1620 },
                    royal: { seedMoney1: 2100, seedMoney2: 2100, seedMoney3: 2100, seedMoney4: 2100 }
                }
            };
        }
    }

    /**
     * 기본 라운드별 등수 funds 값을 반환합니다.
     */
    private getDefaultRoundRankFunds(round: number, rank: number): number {
        const defaultFunds: { [round: number]: { [rank: number]: number } } = {
            1: { 1: 4, 2: 3, 3: 2, 4: 1 },
            2: { 1: 4, 2: 3, 3: 2, 4: 1 },
            3: { 1: 4, 2: 3, 3: 2, 4: 1 },
            4: { 1: 4, 2: 3, 3: 2, 4: 1 },
            5: { 1: 4, 2: 3, 3: 2, 4: 1 }
        };

        return defaultFunds[round]?.[rank] || 0;
    }

    /**
     * 채널별 씨드머니 설정을 가져옵니다.
     */
    async getChannelSeedMoney(): Promise<{
        beginner: { seedMoney1: number, seedMoney2: number, seedMoney3: number, seedMoney4: number },
        intermediate: { seedMoney1: number, seedMoney2: number, seedMoney3: number, seedMoney4: number },
        advanced: { seedMoney1: number, seedMoney2: number, seedMoney3: number, seedMoney4: number },
        expert: { seedMoney1: number, seedMoney2: number, seedMoney3: number, seedMoney4: number },
        royal: { seedMoney1: number, seedMoney2: number, seedMoney3: number, seedMoney4: number }
    }> {
        try {
            const channelSeedMoneyRaw = await this.getSetting<string>('channelSeedMoney');
            this.logger.log(`[GameSettings] getChannelSeedMoney 호출`);
            this.logger.log(`[GameSettings] 원본 channelSeedMoney:`, channelSeedMoneyRaw);

            // 기본값 제공
            const defaultChannelSeedMoney = {
                beginner: { seedMoney1: 15, seedMoney2: 30, seedMoney3: 60, seedMoney4: 90 },
                intermediate: { seedMoney1: 120, seedMoney2: 180, seedMoney3: 240, seedMoney4: 300 },
                advanced: { seedMoney1: 420, seedMoney2: 540, seedMoney3: 660, seedMoney4: 780 },
                expert: { seedMoney1: 990, seedMoney2: 1200, seedMoney3: 1410, seedMoney4: 1620 },
                royal: { seedMoney1: 2100, seedMoney2: 2100, seedMoney3: 2100, seedMoney4: 2100 }
            };

            if (channelSeedMoneyRaw) {
                const parsed = JSON.parse(channelSeedMoneyRaw);
                this.logger.log(`[GameSettings] 파싱된 channelSeedMoney:`, parsed);
                return parsed;
            } else {
                this.logger.log(`[GameSettings] 기본값 사용:`, defaultChannelSeedMoney);
                return defaultChannelSeedMoney;
            }
        } catch (error) {
            this.logger.error('[GameSettings] 채널별 씨드머니 파싱 에러:', error);
            return {
                beginner: { seedMoney1: 15, seedMoney2: 30, seedMoney3: 60, seedMoney4: 90 },
                intermediate: { seedMoney1: 120, seedMoney2: 180, seedMoney3: 240, seedMoney4: 300 },
                advanced: { seedMoney1: 420, seedMoney2: 540, seedMoney3: 660, seedMoney4: 780 },
                expert: { seedMoney1: 990, seedMoney2: 1200, seedMoney3: 1410, seedMoney4: 1620 },
                royal: { seedMoney1: 2100, seedMoney2: 2100, seedMoney3: 2100, seedMoney4: 2100 }
            };
        }
    }
} 