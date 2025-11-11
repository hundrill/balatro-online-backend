import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CardUpdateDto } from './dto/card-update.dto';
import { CardsResponseDto } from './dto/cards-response.dto';
import { PrismaService } from '../prisma.service';
import { SpecialCardType } from '../room/special-card-manager.service';
import { SpecialCardManagerService } from '../room/special-card-manager.service';
import { RedisService } from '../redis/redis.service';
import { GameSettingsService } from '../common/services/game-settings.service';
import { CsvImporterService } from './csv-importer.service';

// 파싱된 조건 정보 인터페이스
interface ParsedCondition {
    effect: string;           // 'total', 'total_count', 'count' 등
    conditionType: string;    // 'by_rank', 'by_suite', 'by_number', 'suite', 'remain_discard' 등
    handTypes: string[];      // ['onepair', 'twopair', 'triple', ...]
    target: string;           // 'handcard', 'playcard', 'playingcard'
    numbers?: string[];       // by_number 패턴에서 숫자들
    count?: number;           // count 패턴에서 숫자
    remainType?: string;      // remain 패턴에서 타입
    suit?: string;            // suite 패턴에서 무늬 (단일)
    suits?: string[];         // by_suite 패턴에서 무늬들 (복수)
}

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
        private readonly csvImporterService: CsvImporterService,
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
            descriptionKo: dbCard.descriptionKo || '',
            descriptionId: dbCard.descriptionId || '',
            descriptionEn: dbCard.descriptionEn || '',
            price: dbCard.price,
            roundProb1: dbCard.roundProb1 || 0,
            roundProb2: dbCard.roundProb2 || 0,
            roundProb3: dbCard.roundProb3 || 0,
            roundProb4: dbCard.roundProb4 || 0,
            roundProb5: dbCard.roundProb5 || 0,
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
            effectValue1: dbCard.effectValue1,
            effectTarget1: dbCard.effectTarget1,
            effectByCount1: dbCard.effectByCount1,
            conditionType2: dbCard.conditionType2,
            conditionValue2: dbCard.conditionValue2,
            conditionOperator2: dbCard.conditionOperator2,
            conditionNumeric2: dbCard.conditionNumeric2,
            effectTiming2: dbCard.effectTiming2,
            effectType2: dbCard.effectType2,
            effectValue2: dbCard.effectValue2,
            effectTarget2: dbCard.effectTarget2,
            effectByCount2: dbCard.effectByCount2,
            // 세 번째 조건-효과 쌍
            conditionType3: dbCard.conditionType3,
            conditionValue3: dbCard.conditionValue3,
            conditionOperator3: dbCard.conditionOperator3,
            conditionNumeric3: dbCard.conditionNumeric3,
            effectTiming3: dbCard.effectTiming3,
            effectType3: dbCard.effectType3,
            effectValue3: dbCard.effectValue3,
            effectTarget3: dbCard.effectTarget3,
            effectByCount3: dbCard.effectByCount3,
            // 네 번째 조건-효과 쌍
            conditionType4: dbCard.conditionType4,
            conditionValue4: dbCard.conditionValue4,
            conditionOperator4: dbCard.conditionOperator4,
            conditionNumeric4: dbCard.conditionNumeric4,
            effectTiming4: dbCard.effectTiming4,
            effectType4: dbCard.effectType4,
            effectValue4: dbCard.effectValue4,
            effectTarget4: dbCard.effectTarget4,
            effectByCount4: dbCard.effectByCount4,
            // 다섯 번째 조건-효과 쌍
            conditionType5: dbCard.conditionType5,
            conditionValue5: dbCard.conditionValue5,
            conditionOperator5: dbCard.conditionOperator5,
            conditionNumeric5: dbCard.conditionNumeric5,
            effectTiming5: dbCard.effectTiming5,
            effectType5: dbCard.effectType5,
            effectValue5: dbCard.effectValue5,
            effectTarget5: dbCard.effectTarget5,
            effectByCount5: dbCard.effectByCount5,
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
                        name: card.name || '',
                        descriptionEn: card.descriptionEn || undefined,
                        descriptionKo: card.descriptionKo || undefined,
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
            this.logger.log(`[DevTools] 업데이트 데이터:`, JSON.stringify(updateData, null, 2));

            // 데이터베이스 업데이트
            const updatedCard = await this.prisma.specialCard.update({
                where: { id: cardId },
                data: {
                    name: updateData.name,
                    descriptionKo: updateData.descriptionKo,
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

                    conditionType1: updateData.conditionType1,
                    conditionValue1: updateData.conditionValue1,
                    conditionOperator1: updateData.conditionOperator1,
                    conditionNumeric1: updateData.conditionNumeric1?.toString(),
                    effectTiming1: updateData.effectTiming1,
                    effectType1: updateData.effectType1,
                    effectValue1: updateData.effectValue1,
                    effectTarget1: updateData.effectTarget1,
                    effectByCount1: updateData.effectByCount1,

                    conditionType2: updateData.conditionType2,
                    conditionValue2: updateData.conditionValue2,
                    conditionOperator2: updateData.conditionOperator2,
                    conditionNumeric2: updateData.conditionNumeric2?.toString(),
                    effectTiming2: updateData.effectTiming2,
                    effectType2: updateData.effectType2,
                    effectValue2: updateData.effectValue2,
                    effectTarget2: updateData.effectTarget2,
                    effectByCount2: updateData.effectByCount2,

                    conditionType3: updateData.conditionType3,
                    conditionValue3: updateData.conditionValue3,
                    conditionOperator3: updateData.conditionOperator3,
                    conditionNumeric3: updateData.conditionNumeric3?.toString(),
                    effectTiming3: updateData.effectTiming3,
                    effectType3: updateData.effectType3,
                    effectValue3: updateData.effectValue3,
                    effectTarget3: updateData.effectTarget3,
                    effectByCount3: updateData.effectByCount3,

                    conditionType4: updateData.conditionType4,
                    conditionValue4: updateData.conditionValue4,
                    conditionOperator4: updateData.conditionOperator4,
                    conditionNumeric4: updateData.conditionNumeric4?.toString(),
                    effectTiming4: updateData.effectTiming4,
                    effectType4: updateData.effectType4,
                    effectValue4: updateData.effectValue4,
                    effectTarget4: updateData.effectTarget4,
                    effectByCount4: updateData.effectByCount4,

                    conditionType5: updateData.conditionType5,
                    conditionValue5: updateData.conditionValue5,
                    conditionOperator5: updateData.conditionOperator5,
                    conditionNumeric5: updateData.conditionNumeric5?.toString(),
                    effectTiming5: updateData.effectTiming5,
                    effectType5: updateData.effectType5,
                    effectValue5: updateData.effectValue5,
                    effectTarget5: updateData.effectTarget5,
                    effectByCount5: updateData.effectByCount5,
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
                .sort((a: any, b: any) => this.sortCardsById(a.id, b.id));
            this.planetCards = dbCards.filter((card: any) => card.id.startsWith('planet_'))
                .map(this.convertToSpecialCard)
                .sort((a: any, b: any) => this.sortCardsById(a.id, b.id));
            this.tarotCards = dbCards.filter((card: any) => card.id.startsWith('tarot_'))
                .map(this.convertToSpecialCard)
                .sort((a: any, b: any) => this.sortCardsById(a.id, b.id));
        } catch (error) {
            this.logger.error('[DevTools] 메모리 데이터 새로고침 실패:', error);
        }
    }

    async rechargeChips(goldChips: number, userSelect: string): Promise<{ success: boolean; message: string; onlineUsers?: string[]; chipChanges?: Array<{ userId: string, before: number, after: number }> }> {
        try {
            this.logger.log(`[DevTools] 칩 변동 시도: 골드 ${goldChips}, 유저: ${userSelect}`);

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
                        goldChip: true
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
                    const beforeChips = user.goldChip;
                    const afterChips = Math.max(0, goldChips); // 입력값으로 설정, 최소값 0 보장

                    await this.prisma.user.update({
                        where: { userId: user.userId },
                        data: { goldChip: afterChips }
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
                    select: { goldChip: true }
                });

                if (!currentUser) {
                    return {
                        success: false,
                        message: `유저 ${userSelect}를 찾을 수 없습니다.`,
                        onlineUsers
                    };
                }

                const beforeChips = currentUser.goldChip;
                const afterChips = Math.max(0, beforeChips + goldChips); // 음수가 되지 않도록

                const updatedUser = await this.prisma.user.update({
                    where: { userId: userSelect },
                    data: {
                        goldChip: afterChips,
                    }
                });

                this.logger.log(`[DevTools] 칩 변동 완료: 유저 ${userSelect} 칩 업데이트`);

                const actionText = goldChips > 0 ? '충전' : '차감';
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

    // =========================
    // Joker CSV Import
    // =========================
    async importJokerCsv(buffer: Buffer) {
        // const text = buffer.toString('utf8');
        // const rows = this.parseCsv(text);

        // if (rows.length === 0) {
        //     return { success: false, message: '빈 CSV 입니다.' };
        // }

        // // 기존 스페셜카드 테이블 모두 삭제
        // await this.prisma.specialCard.deleteMany({});
        // this.logger.log('[DevTools] 기존 스페셜카드 데이터 모두 삭제 완료');

        // const header = rows[0].map(h => h.trim());
        // const dataRows = rows.slice(1);

        // const warnings: string[] = [];
        // const ops: any[] = [];
        // let skipped = 0;

        const text = buffer.toString('utf8');
        const rows = this.parseCsv(text);

        if (rows.length === 0) {
            return { success: false, message: '빈 CSV 입니다.' };
        }

        // 기존 스페셜카드 테이블 모두 삭제
        await this.prisma.specialCard.deleteMany({});
        this.logger.log('[DevTools] 기존 스페셜카드 데이터 모두 삭제 완료');

        const header = rows[0].map(h => h.trim());
        const dataRows = rows.slice(1);

        const timingColumns = [
            'timing_draw',
            'timing_round_start',
            'timing_hand_play',
            'timing_scoring',
            'timing_after_scoring',
            'timing_fold',
            'timing_round_clear',
            'timing_tarot_card_use',
            'timing_planet_card_use',
        ];

        const warnings: string[] = [];
        const ops: any[] = [];
        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const row of dataRows) {
            if (row.length === 0 || row.every(v => v === '')) {
                skipped++;
                continue;
            }

            const jokerData = this.rowToRecord(header, row);
            const idNum = (jokerData.id ?? '').toString().trim();

            if (!idNum) {
                warnings.push('id 누락 행 스킵');
                skipped++;
                continue;
            }

            const cardId = idNum.startsWith('joker_') ? idNum : `joker_${idNum}`;

            // 새로운 파싱 서비스를 사용하여 효과 쌍 추출
            const effectPairs = this.extractEffectPairs(jokerData, timingColumns);

            // 모든 조건-효과 쌍 필드 클리어
            const clearFields: any = {};

            // 1-5번 조건-효과 쌍 모두 클리어
            for (let i = 1; i <= 5; i++) {
                clearFields[`conditionType${i}`] = null;
                clearFields[`conditionValue${i}`] = null;
                clearFields[`conditionOperator${i}`] = null;
                clearFields[`conditionNumeric${i}`] = null;
                clearFields[`effectTiming${i}`] = null;
                clearFields[`effectType${i}`] = null;
                clearFields[`effectValue${i}`] = null;
                clearFields[`effectByCount${i}`] = null;
                clearFields[`effectTarget${i}`] = null;
            }


            // 새 레코드 생성 데이터
            const createData: any = this.cleanUndefined({
                id: cardId,
                type: 'Joker',
                name: jokerData.name,
                descriptionKo: jokerData.desc,
                price: this.parseIntSafe(jokerData.price),
                roundProb1: this.parseIntSafe(jokerData.roundProb_1),
                roundProb2: this.parseIntSafe(jokerData.roundProb_2),
                roundProb3: this.parseIntSafe(jokerData.roundProb_3),
                roundProb4: this.parseIntSafe(jokerData.roundProb_4),
                roundProb5: this.parseIntSafe(jokerData.roundProb_5),
                sprite: this.parseIntSafe(jokerData.sprite),
                basevalue: this.parseFloatSafe(jokerData.basevalue),
                increase: this.parseFloatSafe(jokerData.increase),
                decrease: this.parseFloatSafe(jokerData.decrease),
                maxvalue: this.parseFloatSafe(jokerData.maxvalue),
                isActive: true,
                // 모든 조건-효과 쌍 클리어 후 새로운 데이터 설정
                ...clearFields,
                ...this.buildEffectFields(effectPairs, 1),
                ...this.buildEffectFields(effectPairs, 2),
                ...this.buildEffectFields(effectPairs, 3),
                ...this.buildEffectFields(effectPairs, 4),
                ...this.buildEffectFields(effectPairs, 5),
            });

            // 기존 레코드 업데이트 데이터
            const updateData: any = this.cleanUndefined({
                name: jokerData.name,  // 임시로 주석 처리 (한글 깨짐 문제)
                descriptionKo: jokerData.desc,  // 임시로 주석 처리 (한글 깨짐 문제)
                price: this.parseIntSafe(jokerData.price) || 0,
                roundProb1: this.parseIntSafe(jokerData.roundProb_1) || 0,
                roundProb2: this.parseIntSafe(jokerData.roundProb_2) || 0,
                roundProb3: this.parseIntSafe(jokerData.roundProb_3) || 0,
                roundProb4: this.parseIntSafe(jokerData.roundProb_4) || 0,
                roundProb5: this.parseIntSafe(jokerData.roundProb_5) || 0,
                sprite: this.parseIntSafe(jokerData.sprite) || 0,
                basevalue: this.parseFloatSafe(jokerData.basevalue),
                increase: this.parseFloatSafe(jokerData.increase),
                decrease: this.parseFloatSafe(jokerData.decrease),
                maxvalue: this.parseFloatSafe(jokerData.maxvalue),
                // 모든 조건-효과 쌍 클리어 후 새로운 데이터 설정
                ...clearFields,
                ...this.buildEffectFields(effectPairs, 1),
                ...this.buildEffectFields(effectPairs, 2),
                ...this.buildEffectFields(effectPairs, 3),
                ...this.buildEffectFields(effectPairs, 4),
                ...this.buildEffectFields(effectPairs, 5),
            });

            ops.push(
                this.prisma.specialCard.create({
                    data: createData,
                })
            );
        }

        if (ops.length > 0) {
            await this.prisma.$transaction(ops);
        }

        // 메모리 갱신
        await this.refreshMemoryData();
        await this.specialCardManagerService.initializeCards(this.prisma);

        return {
            success: true,
            message: 'CSV 반영 완료 (기존 데이터 삭제 후 새로 생성)',
            total: dataRows.length,
            created: ops.length,
            updated: 0,
            skipped,
            warnings,
        };
    }

    /**
     * 새로운 파싱 서비스를 사용하여 효과 쌍 추출
     */
    private extractEffectPairs(jokerData: any, timingColumns: string[]) {
        this.logger.warn(`[DevTools] extractEffectPairs invoked with data: ${JSON.stringify(jokerData)}`);
        const pairs: Array<{
            timing: string;
            effectType: string;
            effectValue: string[];
            effectByCount: boolean;
            effectOnCard: boolean;
            effectUseRandomValue: boolean;
            conditionType: string;
            conditionValues: string[];
            conditionOperatorType: string | null;
            conditionNumericValue: number[];
        }> = [];

        for (const tcol of timingColumns) {

            const raw = (jokerData[tcol] || '').trim();
            if (!raw) continue;

            // const raw = (jokerData.effect || '').trim();
            // if (!raw) {
            //     return pairs;
            // }

            const tokens = raw.split('|').map((s: string) => s.trim()).filter(Boolean);

            for (const tok of tokens) {
                if (pairs.length >= 5) {
                    this.logger.warn(`${jokerData.id}: 효과 5개 초과, 무시 -> ${tok}`);
                    break;
                }

                this.logger.log(`[DevTools] 토큰 처리 중: ${pairs.length + 1}번째, 토큰: ${tok}`);

                // 새로운 파싱 서비스 사용 (CSV 레코드 전달)
                let parsed = this.csvImporterService.parseToken2(tok);

                if (parsed) {
                    // 효과 값 설정
                    // let effectValue: string[] = parsed.effectValue;
                    // for (let i = 0; i < effectValue.length; i++) {
                    //     if (effectValue[i].includes('[basevalue]')) {
                    //         effectValue[i] = rec.basevalue;
                    //     } else if (effectValue[i].includes('[increase]')) {
                    //         effectValue[i] = rec.increase;
                    //     } else if (effectValue[i].includes('[decrease]')) {
                    //         effectValue[i] = rec.decrease;
                    //     }
                    // }

                    const pairData = {
                        timing: this.normalizeTiming(tcol),
                        ...parsed
                    };

                    pairs.push(pairData);

                    // this.logger.log(`[DevTools] 쌍 ${pairs.length}번째 추가 완료:`, pairData);
                } else {
                    this.logger.warn(`${jokerData.id}: 토큰 파싱 실패 -> ${tok}`);
                }
            }

            if (pairs.length >= 5) break;
        }

        // this.logger.log(`[DevTools] ${cardId} 최종 쌍 개수: ${pairs.length}`);
        // this.logger.log(`[DevTools] ${cardId} effectPairs 상세:`, JSON.stringify(pairs, null, 2));
        return pairs;
    }


    private buildEffectFields(effectPairs: Array<{
        timing: string;
        effectType: string;
        effectValue: string[];
        effectByCount: boolean;
        effectOnCard: boolean;
        effectUseRandomValue: boolean;
        conditionType: string;
        conditionValues: string[];
        conditionOperatorType: string | null;
        conditionNumericValue: number[];
    }>, index: number) {
        const pair = effectPairs[index - 1];
        if (!pair) return {};

        const fields = {
            [`effectTiming${index}`]: pair.timing,
            [`effectType${index}`]: pair.effectType,
            [`effectValue${index}`]: pair.effectValue.join(', '),//this.parseFloatSafe(pair.effectValue),
            [`effectByCount${index}`]: pair.effectByCount,
            [`conditionType${index}`]: pair.conditionType,
            [`conditionValue${index}`]: pair.conditionValues.join(', '),
            [`conditionOperator${index}`]: pair.conditionOperatorType,
            [`conditionNumeric${index}`]: pair.conditionNumericValue.length > 0 ? pair.conditionNumericValue.join(',') : null,
        };

        // this.logger.log(`[DevTools] buildEffectFields ${index}:`, fields);
        return fields;
    }

    /**
     * 타이밍 컬럼명을 정규화
     */
    private normalizeTiming(col: string): string {
        const timingMap: Record<string, string> = {
            'timing_draw': 'Draw',
            'timing_round_start': 'RoundStart',
            'timing_hand_play': 'OnHandPlay',
            'timing_scoring': 'OnScoring',
            'timing_after_scoring': 'OnAfterScoring',
            'timing_fold': 'Fold',
            'timing_round_clear': 'OnAfterScoring',
            'timing_tarot_card_use': 'TarotCardUse',
            'timing_planet_card_use': 'PlanetCardUse',
        };
        return timingMap[col] || col;
    }

    /**
     * CSV 파싱
     */
    private parseCsv(text: string): string[][] {
        const rows: string[][] = [];
        let current: string[] = [];
        let field = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (inQuotes) {
                if (c === '"') {
                    if (text[i + 1] === '"') {
                        field += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += c;
                }
            } else {
                if (c === '"') inQuotes = true;
                else if (c === ',') {
                    current.push(field);
                    field = '';
                }
                else if (c === '\n' || c === '\r') {
                    if (field !== '' || current.length > 0) {
                        current.push(field);
                        rows.push(current);
                        current = [];
                        field = '';
                    }
                    // consume \r\n pair
                    if (c === '\r' && text[i + 1] === '\n') i++;
                } else {
                    field += c;
                }
            }
        }

        if (field !== '' || current.length > 0) {
            current.push(field);
            rows.push(current);
        }

        return rows;
    }

    /**
     * CSV 행을 레코드로 변환
     */
    private rowToRecord(header: string[], row: string[]) {
        const rec: any = {};
        for (let i = 0; i < header.length; i++) {
            rec[header[i]] = (row[i] ?? '').trim();
        }
        return rec;
    }

    /**
     * 안전한 정수 파싱
     */
    private parseIntSafe(v: any): number | undefined {
        if (v === undefined || v === null || v === '') return undefined;
        const n = parseInt(String(v));
        return Number.isNaN(n) ? undefined : n;
    }

    /**
     * 안전한 부동소수점 파싱
     */
    private parseFloatSafe(v: any): number | undefined {
        if (v === undefined || v === null || v === '') return undefined;
        const n = parseFloat(String(v));
        return Number.isNaN(n) ? undefined : n;
    }

    /**
     * undefined 값 제거
     */
    private cleanUndefined<T extends Record<string, any>>(obj: T): T {
        const out: any = {};
        for (const [k, v] of Object.entries(obj)) {
            if (v !== undefined) out[k] = v;
        }
        return out as T;
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