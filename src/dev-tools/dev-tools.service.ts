import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CardUpdateDto } from './dto/card-update.dto';
import { CardsResponseDto } from './dto/cards-response.dto';
import { PrismaService } from '../prisma.service';
import { SpecialCard, SpecialCardType } from '../room/special-card-manager.service';
import { SpecialCardManagerService } from '../room/special-card-manager.service';
import { RedisService } from '../redis/redis.service';
import { GameSettingsService } from '../common/services/game-settings.service';

@Injectable()
export class DevToolsService implements OnModuleInit {
    private readonly logger = new Logger(DevToolsService.name);
    private jokerCards: any[] = [];
    private planetCards: any[] = [];
    private tarotCards: any[] = [];

    constructor(
        private readonly prisma: PrismaService,
        private readonly specialCardManagerService: SpecialCardManagerService,
        private readonly redisService: RedisService,
        private readonly gameSettingsService: GameSettingsService,
    ) { }


    async onModuleInit() {
        await this.loadCardsFromDatabase();
    }



    private convertToSpecialCard(dbCard: any): any {
        // 데이터베이스의 type 필드 또는 카드 ID를 기반으로 타입 결정
        let type: SpecialCardType;
        if (dbCard.type) {
            // 데이터베이스에 type 필드가 있으면 사용
            type = dbCard.type as SpecialCardType;
        } else if (dbCard.id.startsWith('joker_')) {
            type = SpecialCardType.Joker;
        } else if (dbCard.id.startsWith('planet_')) {
            type = SpecialCardType.Planet;
        } else if (dbCard.id.startsWith('tarot_')) {
            type = SpecialCardType.Tarot;
        } else {
            type = SpecialCardType.Joker; // 기본값
        }

        return {
            id: dbCard.id,
            name: dbCard.name,
            description: dbCard.description || dbCard.descriptionKo || '',
            descriptionKo: dbCard.descriptionKo || dbCard.description || '',
            descriptionId: dbCard.descriptionId || '',
            descriptionEn: dbCard.descriptionEn || '',
            price: dbCard.price,
            sprite: dbCard.sprite || 0,
            type: type.toString(),
            baseValue: dbCard.basevalue,
            increase: dbCard.increase,
            decrease: dbCard.decrease,
            maxValue: dbCard.maxvalue,
            needCardCount: dbCard.need_card_count,
            enhanceChips: dbCard.enhanceChips,
            enhanceMul: dbCard.enhanceMul,
            isActive: dbCard.isActive !== false, // 기본값 true
            // 2개 고정 조건-효과 시스템 필드들
            conditionType1: dbCard.conditionType1,
            conditionValue1: dbCard.conditionValue1,
            conditionOperator1: dbCard.conditionOperator1,
            conditionNumeric1: dbCard.conditionNumeric1,
            effectTiming1: dbCard.effectTiming1,
            effectType1: dbCard.effectType1,
            effectTarget1: dbCard.effectTarget1,
            conditionType2: dbCard.conditionType2,
            conditionValue2: dbCard.conditionValue2,
            conditionOperator2: dbCard.conditionOperator2,
            conditionNumeric2: dbCard.conditionNumeric2,
            effectTiming2: dbCard.effectTiming2,
            effectType2: dbCard.effectType2,
            effectTarget2: dbCard.effectTarget2,
        };
    }

    private async loadCardsFromDatabase() {
        try {
            // 데이터베이스에서 모든 카드 로드
            const dbCards = await this.prisma.specialCard.findMany();

            if (dbCards.length === 0) {
                // 데이터베이스가 비어있으면 초기 데이터 삽입
                this.logger.log('[DevTools] 데이터베이스가 비어있어 초기 카드 데이터를 삽입합니다.');
                await this.initializeCardsInDatabase();
            } else {
                // 데이터베이스에서 카드들을 타입별로 분류하고 변환
                this.jokerCards = dbCards.filter((card: any) => card.id.startsWith('joker_'))
                    .map(this.convertToSpecialCard)
                    .sort((a: any, b: any) => this.sortCardsById(a.id, b.id));
                this.planetCards = dbCards.filter((card: any) => card.id.startsWith('planet_'))
                    .map(this.convertToSpecialCard)
                    .sort((a: any, b: any) => this.sortCardsById(a.id, b.id));
                this.tarotCards = dbCards.filter((card: any) => card.id.startsWith('tarot_'))
                    .map(this.convertToSpecialCard)
                    .sort((a: any, b: any) => this.sortCardsById(a.id, b.id));
                this.logger.log(`[DevTools] 데이터베이스에서 카드 로드 완료: 조커 ${this.jokerCards.length}개, 행성 ${this.planetCards.length}개, 타로 ${this.tarotCards.length}개`);
            }
        } catch (error) {
            this.logger.error('[DevTools] 데이터베이스에서 카드 로드 실패:', error);
            // 에러 발생 시 메모리 데이터 사용
            this.jokerCards = [...this.specialCardManagerService.getAllSpecialCards().jokerCards]
                .sort((a, b) => this.sortCardsById(a.id, b.id));
            this.planetCards = [...this.specialCardManagerService.getAllSpecialCards().planetCards]
                .sort((a, b) => this.sortCardsById(a.id, b.id));
            this.tarotCards = [...this.specialCardManagerService.getAllSpecialCards().tarotCards]
                .sort((a, b) => this.sortCardsById(a.id, b.id));
        }
    }

    // 카드 ID를 숫자 순서로 정렬하는 헬퍼 메서드
    private sortCardsById(a: string, b: string): number {
        // joker_1, joker_10, planet_1, tarot_1 등의 형태에서 숫자 부분 추출
        const aMatch = a.match(/_(\d+)$/);
        const bMatch = b.match(/_(\d+)$/);

        if (aMatch && bMatch) {
            const aNum = parseInt(aMatch[1]);
            const bNum = parseInt(bMatch[1]);
            return aNum - bNum; // 오름차순 정렬
        }

        return a.localeCompare(b); // 숫자가 없으면 문자열 비교
    }

    private async initializeCardsInDatabase() {
        try {
            const allCards = [...this.specialCardManagerService.getAllSpecialCards().jokerCards, ...this.specialCardManagerService.getAllSpecialCards().planetCards, ...this.specialCardManagerService.getAllSpecialCards().tarotCards];

            for (const card of allCards) {
                await this.prisma.specialCard.create({
                    data: {
                        id: card.id,
                        name: card.name,
                        description: card.description,
                        descriptionKo: card.description || undefined,
                        descriptionId: undefined,
                        price: card.price,
                        sprite: card.sprite,
                        type: card.type.toString(),
                        basevalue: card.baseValue,
                        increase: card.increase,
                        decrease: card.decrease,
                        maxvalue: card.maxValue,
                        need_card_count: card.needCardCount,
                        enhanceChips: card.enhanceChips,
                        enhanceMul: card.enhanceMul,
                        isActive: card.isActive !== false, // 기본값 true
                    }
                });
            }

            this.jokerCards = [...this.specialCardManagerService.getAllSpecialCards().jokerCards];
            this.planetCards = [...this.specialCardManagerService.getAllSpecialCards().planetCards];
            this.tarotCards = [...this.specialCardManagerService.getAllSpecialCards().tarotCards];

            this.logger.log('[DevTools] 초기 카드 데이터 삽입 완료');
        } catch (error) {
            this.logger.error('[DevTools] 초기 카드 데이터 삽입 실패:', error);
            throw error;
        }
    }

    getAllCards(): CardsResponseDto {
        return {
            jokerCards: this.jokerCards,
            planetCards: this.planetCards,
            tarotCards: this.tarotCards,
        };
    }

    async updateCard(cardId: string, updateData: CardUpdateDto): Promise<boolean> {
        try {
            this.logger.log(`[DevTools] 카드 업데이트 시도: ${cardId}`);

            // 데이터베이스 업데이트
            const updatedCard = await this.prisma.specialCard.update({
                where: { id: cardId },
                data: {
                    name: updateData.name,
                    description: updateData.description, // legacy
                    descriptionKo: updateData.descriptionKo ?? updateData.description,
                    descriptionId: updateData.descriptionId ?? undefined,
                    descriptionEn: updateData.descriptionEn ?? undefined,
                    price: updateData.price,
                    basevalue: updateData.baseValue,
                    increase: updateData.increase,
                    decrease: updateData.decrease,
                    maxvalue: updateData.maxValue,
                    need_card_count: updateData.needCardCount,
                    enhanceChips: updateData.enhanceChips,
                    enhanceMul: updateData.enhanceMul,
                    isActive: updateData.isActive,
                    // 2개 고정 조건-효과 시스템 필드들
                    conditionType1: updateData.conditionType1,
                    conditionValue1: updateData.conditionValue1,
                    conditionOperator1: updateData.conditionOperator1,
                    conditionNumeric1: updateData.conditionNumeric1,
                    effectTiming1: updateData.effectTiming1,
                    effectType1: updateData.effectType1,
                    effectTarget1: updateData.effectTarget1,
                    conditionType2: updateData.conditionType2,
                    conditionValue2: updateData.conditionValue2,
                    conditionOperator2: updateData.conditionOperator2,
                    conditionNumeric2: updateData.conditionNumeric2,
                    effectTiming2: updateData.effectTiming2,
                    effectType2: updateData.effectType2,
                    effectTarget2: updateData.effectTarget2,
                }
            });

            // 메모리 데이터도 업데이트
            await this.refreshMemoryData();

            // SpecialCardManagerService의 메모리 데이터도 업데이트
            await this.specialCardManagerService.initializeCards(this.prisma);

            this.logger.log(`[DevTools] 카드 업데이트 완료: ${cardId}`);
            return true;
        } catch (error) {
            this.logger.error(`[DevTools] 카드 업데이트 실패: ${cardId}`, error);
            return false;
        }
    }

    async getCardById(cardId: string): Promise<any | null> {
        try {
            const card = await this.prisma.specialCard.findUnique({
                where: { id: cardId }
            });
            return card ? this.convertToSpecialCard(card) : null;
        } catch (error) {
            this.logger.error(`[DevTools] 카드 조회 실패: ${cardId}`, error);
            return null;
        }
    }

    private async refreshMemoryData() {
        try {
            const dbCards = await this.prisma.specialCard.findMany();
            this.jokerCards = dbCards.filter((card: any) => card.id.startsWith('joker_'))
                .map(this.convertToSpecialCard)
                .sort((a: SpecialCard, b: SpecialCard) => this.sortCardsById(a.id, b.id));
            this.planetCards = dbCards.filter((card: any) => card.id.startsWith('planet_'))
                .map(this.convertToSpecialCard)
                .sort((a: SpecialCard, b: SpecialCard) => this.sortCardsById(a.id, b.id));
            this.tarotCards = dbCards.filter((card: any) => card.id.startsWith('tarot_'))
                .map(this.convertToSpecialCard)
                .sort((a: SpecialCard, b: SpecialCard) => this.sortCardsById(a.id, b.id));
        } catch (error) {
            this.logger.error('[DevTools] 메모리 데이터 새로고침 실패:', error);
        }
    }

    async rechargeChips(silverChips: number, userSelect: string): Promise<{ success: boolean; message: string; onlineUsers?: string[]; chipChanges?: Array<{ userId: string, before: number, after: number }> }> {
        try {
            this.logger.log(`[DevTools] 칩 변동 시도: 실버 ${silverChips}, 유저: ${userSelect}`);

            // 게임 접속 중인 유저 목록 가져오기
            const onlineUsers = await this.redisService.getOnlineUsers();
            this.logger.log(`[DevTools] 현재 게임 접속 중인 유저: ${onlineUsers.join(', ')}`);

            if (userSelect === 'all') {
                // 모든 유저의 칩을 설정값으로 초기화하되, 게임 접속 중인 유저는 제외
                const usersToUpdate = await this.prisma.user.findMany({
                    where: {
                        userId: {
                            notIn: onlineUsers
                        }
                    },
                    select: {
                        userId: true,
                        silverChip: true
                    }
                });

                if (usersToUpdate.length === 0) {
                    return {
                        success: false,
                        message: '게임 접속 중인 유저가 없어서 초기화할 수 있는 유저가 없습니다.',
                        onlineUsers
                    };
                }

                // 칩 설정 전 상태 저장 및 업데이트
                const chipChanges = [];
                for (const user of usersToUpdate) {
                    const beforeChips = user.silverChip;
                    const afterChips = Math.max(0, silverChips); // 입력값으로 설정, 최소값 0 보장

                    await this.prisma.user.update({
                        where: { userId: user.userId },
                        data: { silverChip: afterChips }
                    });

                    chipChanges.push({
                        userId: user.userId,
                        before: beforeChips,
                        after: afterChips
                    });
                }

                this.logger.log(`[DevTools] 칩 일괄 초기화 완료: ${chipChanges.length}명의 유저 칩 업데이트`);

                return {
                    success: true,
                    message: `칩 일괄 초기화 완료: ${chipChanges.length}명의 유저 (게임 접속 중인 유저 제외)`,
                    onlineUsers,
                    chipChanges
                };
            } else {
                // 특정 유저의 칩만 변동
                if (onlineUsers.includes(userSelect)) {
                    return {
                        success: false,
                        message: `유저 ${userSelect}가 현재 게임에 접속 중입니다. 게임을 종료한 후 다시 시도해주세요.`,
                        onlineUsers
                    };
                }

                // 현재 칩 상태 조회
                const currentUser = await this.prisma.user.findUnique({
                    where: { userId: userSelect },
                    select: { silverChip: true }
                });

                if (!currentUser) {
                    return {
                        success: false,
                        message: `유저 ${userSelect}를 찾을 수 없습니다.`,
                        onlineUsers
                    };
                }

                const beforeChips = currentUser.silverChip;
                const afterChips = Math.max(0, beforeChips + silverChips); // 음수가 되지 않도록

                const updatedUser = await this.prisma.user.update({
                    where: { userId: userSelect },
                    data: {
                        silverChip: afterChips,
                    }
                });

                this.logger.log(`[DevTools] 칩 변동 완료: 유저 ${userSelect} 칩 업데이트`);

                const actionText = silverChips > 0 ? '충전' : '차감';
                return {
                    success: true,
                    message: `유저 ${userSelect}의 칩이 성공적으로 ${actionText}되었습니다.`,
                    onlineUsers,
                    chipChanges: [{
                        userId: userSelect,
                        before: beforeChips,
                        after: afterChips
                    }]
                };
            }
        } catch (error) {
            this.logger.error('[DevTools] 칩 변동 실패:', error);
            return {
                success: false,
                message: '칩 변동 중 오류가 발생했습니다.'
            };
        }
    }

    async getAllUsers() {
        try {
            const users = await this.prisma.user.findMany({
                select: {
                    userId: true,
                    nickname: true,
                    silverChip: true,
                    goldChip: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            return users;
        } catch (error) {
            this.logger.error('[DevTools] 사용자 목록 조회 실패:', error);
            throw error;
        }
    }

    // GameSetting 관련 메서드들
    async getAllGameSettings() {
        try {
            const settings = await this.prisma.gameSetting.findMany({
                orderBy: {
                    createdAt: 'desc',
                },
            });
            return settings.map(setting => ({
                ...setting,
                value: JSON.parse(setting.value), // JSON 문자열을 객체로 변환
            }));
        } catch (error) {
            this.logger.error('[DevTools] 게임 설정 목록 조회 실패:', error);
            throw error;
        }
    }

    async getGameSettingById(id: string) {
        try {
            const setting = await this.prisma.gameSetting.findUnique({
                where: { id },
            });
            if (!setting) {
                return null;
            }
            return {
                ...setting,
                value: JSON.parse(setting.value),
            };
        } catch (error) {
            this.logger.error('[DevTools] 게임 설정 조회 실패:', error);
            throw error;
        }
    }

    async createGameSetting(id: string, name: string, value: any, description?: string) {
        try {
            const setting = await this.prisma.gameSetting.create({
                data: {
                    id,
                    name,
                    value: JSON.stringify(value),
                    description,
                    isActive: true,
                },
            });
            this.logger.log(`[DevTools] 게임 설정 생성 완료: ${id}`);
            return {
                ...setting,
                value: JSON.parse(setting.value),
            };
        } catch (error) {
            this.logger.error('[DevTools] 게임 설정 생성 실패:', error);
            throw error;
        }
    }

    async updateGameSetting(id: string, updateData: { name?: string; value?: any; description?: string }) {
        try {
            const updatePayload: any = {};
            if (updateData.name !== undefined) updatePayload.name = updateData.name;
            if (updateData.value !== undefined) updatePayload.value = JSON.stringify(updateData.value);
            if (updateData.description !== undefined) updatePayload.description = updateData.description;

            const setting = await this.prisma.gameSetting.update({
                where: { id },
                data: updatePayload,
            });
            this.logger.log(`[DevTools] 게임 설정 업데이트 완료: ${id}`);

            // 게임 설정 캐시 무효화
            await this.gameSettingsService.invalidateCache();

            return {
                ...setting,
                value: JSON.parse(setting.value),
            };
        } catch (error) {
            this.logger.error('[DevTools] 게임 설정 업데이트 실패:', error);
            throw error;
        }
    }

    async deleteGameSetting(id: string) {
        try {
            await this.prisma.gameSetting.delete({
                where: { id },
            });
            this.logger.log(`[DevTools] 게임 설정 삭제 완료: ${id}`);
            return true;
        } catch (error) {
            this.logger.error('[DevTools] 게임 설정 삭제 실패:', error);
            throw error;
        }
    }

    async getGameSettingsForClient() {
        try {
            const settings = await this.prisma.gameSetting.findMany({
                where: { isActive: true },
            });

            const gameSettings: any = {};
            settings.forEach(setting => {
                try {
                    gameSettings[setting.name] = JSON.parse(setting.value);
                } catch (error) {
                    this.logger.error(`[DevTools] 게임 설정 파싱 실패: ${setting.name}`, error);
                }
            });

            return gameSettings;
        } catch (error) {
            this.logger.error('[DevTools] 클라이언트용 게임 설정 조회 실패:', error);
            throw error;
        }
    }

    // 칩 설정 관련 메서드들
    async getAllChipSettings() {
        try {
            const settings = await this.prisma.gameSetting.findMany({
                where: {
                    isActive: true,
                    name: { in: ['chipSettings'] }
                },
            });

            return settings.map(setting => ({
                ...setting,
                value: JSON.parse(setting.value),
            }));
        } catch (error) {
            this.logger.error('[DevTools] 칩 설정 목록 조회 실패:', error);
            throw error;
        }
    }

    async getChipSettingById(id: string) {
        try {
            const setting = await this.prisma.gameSetting.findUnique({
                where: { id },
            });
            if (!setting) {
                return null;
            }
            return {
                ...setting,
                value: JSON.parse(setting.value),
            };
        } catch (error) {
            this.logger.error('[DevTools] 칩 설정 조회 실패:', error);
            throw error;
        }
    }

    async createChipSetting(id: string, name: string, value: any, description?: string) {
        try {
            const setting = await this.prisma.gameSetting.create({
                data: {
                    id,
                    name,
                    value: JSON.stringify(value),
                    description,
                    isActive: true,
                },
            });
            this.logger.log(`[DevTools] 칩 설정 생성 완료: ${id}`);
            return {
                ...setting,
                value: JSON.parse(setting.value),
            };
        } catch (error) {
            this.logger.error('[DevTools] 칩 설정 생성 실패:', error);
            throw error;
        }
    }

    async updateChipSetting(id: string, updateData: { name?: string; value?: any; description?: string }) {
        try {
            const updatePayload: any = {};
            if (updateData.name !== undefined) updatePayload.name = updateData.name;
            if (updateData.value !== undefined) updatePayload.value = JSON.stringify(updateData.value);
            if (updateData.description !== undefined) updatePayload.description = updateData.description;

            const setting = await this.prisma.gameSetting.update({
                where: { id },
                data: updatePayload,
            });
            this.logger.log(`[DevTools] 칩 설정 업데이트 완료: ${id}`);

            // 게임 설정 캐시 무효화
            await this.gameSettingsService.invalidateCache();

            return {
                ...setting,
                value: JSON.parse(setting.value),
            };
        } catch (error) {
            this.logger.error('[DevTools] 칩 설정 업데이트 실패:', error);
            throw error;
        }
    }

    async deleteChipSetting(id: string) {
        try {
            await this.prisma.gameSetting.delete({
                where: { id },
            });
            this.logger.log(`[DevTools] 칩 설정 삭제 완료: ${id}`);
            return true;
        } catch (error) {
            this.logger.error('[DevTools] 칩 설정 삭제 실패:', error);
            throw error;
        }
    }
} 