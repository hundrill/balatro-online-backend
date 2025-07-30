import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CardUpdateDto } from './dto/card-update.dto';
import { CardsResponseDto } from './dto/cards-response.dto';
import { PrismaService } from '../prisma.service';
import { SpecialCard, SpecialCardType } from '../room/special-card-manager.service';
import { SpecialCardManagerService } from '../room/special-card-manager.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DevToolsService implements OnModuleInit {
    private readonly logger = new Logger(DevToolsService.name);
    private jokerCards: SpecialCard[] = [];
    private planetCards: SpecialCard[] = [];
    private tarotCards: SpecialCard[] = [];

    constructor(
        private readonly prisma: PrismaService,
        private readonly specialCardManagerService: SpecialCardManagerService,
        private readonly redisService: RedisService,
    ) { }


    async onModuleInit() {
        await this.loadCardsFromDatabase();
    }

    private convertToSpecialCard(dbCard: any): SpecialCard {
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
            description: dbCard.description || '',
            price: dbCard.price,
            sprite: dbCard.sprite || 0,
            type: type,
            baseValue: dbCard.basevalue,
            increase: dbCard.increase,
            decrease: dbCard.decrease,
            maxValue: dbCard.maxvalue,
            needCardCount: dbCard.need_card_count,
            enhanceChips: dbCard.enhanceChips,
            enhanceMul: dbCard.enhanceMul,
            isActive: dbCard.isActive !== false, // 기본값 true
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
                // 데이터베이스에서 카드들을 타입별로 분류하고 SpecialCard 타입으로 변환
                this.jokerCards = dbCards.filter((card: any) => card.id.startsWith('joker_'))
                    .map(this.convertToSpecialCard)
                    .sort((a: SpecialCard, b: SpecialCard) => this.sortCardsById(a.id, b.id));
                this.planetCards = dbCards.filter((card: any) => card.id.startsWith('planet_'))
                    .map(this.convertToSpecialCard)
                    .sort((a: SpecialCard, b: SpecialCard) => this.sortCardsById(a.id, b.id));
                this.tarotCards = dbCards.filter((card: any) => card.id.startsWith('tarot_'))
                    .map(this.convertToSpecialCard)
                    .sort((a: SpecialCard, b: SpecialCard) => this.sortCardsById(a.id, b.id));
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
                    description: updateData.description,
                    price: updateData.price,
                    basevalue: updateData.baseValue,
                    increase: updateData.increase,
                    decrease: updateData.decrease,
                    maxvalue: updateData.maxValue,
                    need_card_count: updateData.needCardCount,
                    enhanceChips: updateData.enhanceChips,
                    enhanceMul: updateData.enhanceMul,
                    isActive: updateData.isActive,
                }
            });

            // 메모리 데이터도 업데이트
            await this.refreshMemoryData();

            this.logger.log(`[DevTools] 카드 업데이트 완료: ${cardId}`);
            return true;
        } catch (error) {
            this.logger.error(`[DevTools] 카드 업데이트 실패: ${cardId}`, error);
            return false;
        }
    }

    async getCardById(cardId: string): Promise<SpecialCard | null> {
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

    async rechargeChips(silverChips: number, userSelect: string): Promise<{ success: boolean; message: string; onlineUsers?: string[] }> {
        try {
            this.logger.log(`[DevTools] 칩 충전 시도: 실버 ${silverChips}, 유저: ${userSelect}`);

            // 게임 접속 중인 유저 목록 가져오기
            const onlineUsers = await this.redisService.getOnlineUsers();
            this.logger.log(`[DevTools] 현재 게임 접속 중인 유저: ${onlineUsers.join(', ')}`);

            if (userSelect === 'all') {
                // 모든 유저의 칩을 충전하되, 게임 접속 중인 유저는 제외
                const usersToUpdate = await this.prisma.user.findMany({
                    where: {
                        email: {
                            notIn: onlineUsers
                        }
                    }
                });

                if (usersToUpdate.length === 0) {
                    return {
                        success: false,
                        message: '게임 접속 중인 유저가 없어서 충전할 수 있는 유저가 없습니다.',
                        onlineUsers
                    };
                }

                const updatedUsers = await this.prisma.user.updateMany({
                    where: {
                        email: {
                            notIn: onlineUsers
                        }
                    },
                    data: {
                        silverChip: silverChips,
                    }
                });

                this.logger.log(`[DevTools] 칩 충전 완료: ${updatedUsers.count}명의 유저 칩 업데이트`);

                return {
                    success: true,
                    message: `칩 충전 완료: ${updatedUsers.count}명의 유저 (게임 접속 중인 유저 제외)`,
                    onlineUsers
                };
            } else {
                // 특정 유저의 칩만 충전
                if (onlineUsers.includes(userSelect)) {
                    return {
                        success: false,
                        message: `유저 ${userSelect}가 현재 게임에 접속 중입니다. 게임을 종료한 후 다시 시도해주세요.`,
                        onlineUsers
                    };
                }

                const updatedUser = await this.prisma.user.update({
                    where: { email: userSelect },
                    data: {
                        silverChip: silverChips,
                    }
                });

                this.logger.log(`[DevTools] 칩 충전 완료: 유저 ${userSelect} 칩 업데이트`);

                return {
                    success: true,
                    message: `유저 ${userSelect}의 칩이 성공적으로 충전되었습니다.`,
                    onlineUsers
                };
            }
        } catch (error) {
            this.logger.error('[DevTools] 칩 충전 실패:', error);
            return {
                success: false,
                message: '칩 충전 중 오류가 발생했습니다.'
            };
        }
    }

    async getAllUsers() {
        try {
            const users = await this.prisma.user.findMany({
                select: {
                    email: true,
                    nickname: true,
                    silverChip: true,
                }
            });
            return users;
        } catch (error) {
            this.logger.error('[DevTools] 유저 목록 조회 실패:', error);
            return [];
        }
    }
} 