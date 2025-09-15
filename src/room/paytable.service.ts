import { Injectable } from '@nestjs/common';
import { PokerHand } from './poker-types';
import { CardData } from './deck.util';

// 카드별 성장값 데이터 구조
export class CardEnhancement {
    cardId: string;           // suit_rank 형태의 카드 ID (예: Hearts_1, Spades_13)
    enhanceChips: number;     // 성장 칩스 (초기값: 0)
    enhanceMul: number;       // 성장 배수 (초기값: 1.0)
}

@Injectable()
export class PaytableService {
    // 기본 값들 (기본값으로 사용)
    private readonly defaultBaseChips: Map<PokerHand, number> = new Map([
        [PokerHand.HighCard, 5],
        [PokerHand.OnePair, 10],
        [PokerHand.TwoPair, 20],
        [PokerHand.ThreeOfAKind, 30],
        [PokerHand.Straight, 30],
        [PokerHand.Flush, 35],
        [PokerHand.FullHouse, 50],
        [PokerHand.FourOfAKind, 60],
        [PokerHand.StraightFlush, 100],
    ]);

    private readonly defaultMultipliers: Map<PokerHand, number> = new Map([
        [PokerHand.HighCard, 1],
        [PokerHand.OnePair, 2],
        [PokerHand.TwoPair, 2],
        [PokerHand.ThreeOfAKind, 3],
        [PokerHand.Straight, 4],
        [PokerHand.Flush, 4],
        [PokerHand.FullHouse, 5],
        [PokerHand.FourOfAKind, 7],
        [PokerHand.StraightFlush, 8],
    ]);

    // 유저별 데이터 관리
    private readonly userLevels: Map<string, Map<PokerHand, number>> = new Map();
    private readonly userCounts: Map<string, Map<PokerHand, number>> = new Map();
    private readonly userBaseChips: Map<string, Map<PokerHand, number>> = new Map(); // 유저별 baseChips
    private readonly userMultipliers: Map<string, Map<PokerHand, number>> = new Map(); // 유저별 multipliers

    // 카드별 성장값 관리 추가
    private readonly userCardEnhancements: Map<string, Map<string, CardEnhancement>> = new Map();

    // 유저별 데이터 초기화
    private initializeUserData(userId: string): void {
        if (!this.userLevels.has(userId)) {
            this.userLevels.set(userId, new Map());
            this.userCounts.set(userId, new Map());
            this.userBaseChips.set(userId, new Map());
            this.userMultipliers.set(userId, new Map());

            // 모든 족보에 대해 기본값 설정
            Object.values(PokerHand).forEach(hand => {
                if (hand !== PokerHand.None) {
                    this.userLevels.get(userId)!.set(hand, 1); // 레벨 1부터 시작
                    this.userCounts.get(userId)!.set(hand, 0);
                    // 기본 baseChips와 multipliers 복사
                    this.userBaseChips.get(userId)!.set(hand, this.defaultBaseChips.get(hand) || 0);
                    this.userMultipliers.get(userId)!.set(hand, this.defaultMultipliers.get(hand) || 0);
                }
            });
        }
    }

    // 특정 카드 초기화 함수
    private initializeCardEnhancement(userId: string, cardData: CardData): CardEnhancement {
        if (!this.userCardEnhancements.has(userId)) {
            this.userCardEnhancements.set(userId, new Map());
        }

        const cardId = `${cardData.suit}_${cardData.rank}`;

        if (!this.userCardEnhancements.get(userId)!.has(cardId)) {
            this.userCardEnhancements.get(userId)!.set(cardId, new CardEnhancement());
            this.userCardEnhancements.get(userId)!.get(cardId)!.cardId = cardId;
            this.userCardEnhancements.get(userId)!.get(cardId)!.enhanceChips = 0;    // 초기값
            this.userCardEnhancements.get(userId)!.get(cardId)!.enhanceMul = 1.0;    // 초기값
        }

        return this.userCardEnhancements.get(userId)!.get(cardId)!;
    }

    getLevel(userId: string, hand: PokerHand): number {
        this.initializeUserData(userId);
        return this.userLevels.get(userId)!.get(hand) || 0;
    }

    getCount(userId: string, hand: PokerHand): number {
        this.initializeUserData(userId);
        return this.userCounts.get(userId)!.get(hand) || 0;
    }

    getChips(userId: string, hand: PokerHand): number {
        this.initializeUserData(userId);
        const baseChip = this.userBaseChips.get(userId)!.get(hand) || 0;
        return baseChip;
    }

    getMultiplier(userId: string, hand: PokerHand): number {
        this.initializeUserData(userId);
        const baseMultiplier = this.userMultipliers.get(userId)!.get(hand) || 0;
        return baseMultiplier;
    }

    enhanceLevel(userId: string, hand: PokerHand): void {
        this.initializeUserData(userId);
        const currentLevel = this.userLevels.get(userId)!.get(hand) || 0;
        this.userLevels.get(userId)!.set(hand, currentLevel + 1);
    }

    enhanceCount(userId: string, hand: PokerHand): void {
        this.initializeUserData(userId);
        const currentCount = this.userCounts.get(userId)!.get(hand) || 0;
        this.userCounts.get(userId)!.set(hand, currentCount + 1);
    }

    enhanceMultiplier(userId: string, hand: PokerHand, plus: number): void {
        this.initializeUserData(userId);
        const currentMultiplier = this.userMultipliers.get(userId)!.get(hand) || 0;
        this.userMultipliers.get(userId)!.set(hand, currentMultiplier + plus);
    }

    enhanceChips(userId: string, hand: PokerHand, plus: number): void {
        this.initializeUserData(userId);
        const currentChips = this.userBaseChips.get(userId)!.get(hand) || 0;
        this.userBaseChips.get(userId)!.set(hand, currentChips + plus);
    }

    // 카드별 성장값 관리 함수들

    /**
     * 카드 칩스 증가 (enhanceChips와 유사)
     */
    enhanceCardChips(userId: string, cardData: CardData, amount: number): void {
        const enhancement = this.initializeCardEnhancement(userId, cardData);
        enhancement.enhanceChips += amount;
    }

    /**
     * 카드 배수 증가 (enhanceMultiplier와 유사)
     */
    enhanceCardMultiplier(userId: string, cardData: CardData, amount: number): void {
        const enhancement = this.initializeCardEnhancement(userId, cardData);
        enhancement.enhanceMul += amount;
    }

    /**
     * 카드 성장값 조회 (getChips와 유사)
     */
    getCardEnhancement(userId: string, cardData: CardData): CardEnhancement {
        return this.initializeCardEnhancement(userId, cardData);
    }

    /**
     * 카드 성장 칩스 값 가져오기
     */
    getCardEnhanceChips(userId: string, cardData: CardData): number {
        const enhancement = this.initializeCardEnhancement(userId, cardData);
        return enhancement.enhanceChips;
    }

    /**
     * 카드 성장 배수 값 가져오기
     */
    getCardEnhanceMultiplier(userId: string, cardData: CardData): number {
        const enhancement = this.initializeCardEnhancement(userId, cardData);
        return enhancement.enhanceMul;
    }

    /**
     * 유저의 모든 카드별 성장값을 가져오기
     */
    getUserCardEnhancements(userId: string): Record<string, { enhanceChips: number; enhanceMul: number }> {
        const enhancements: Record<string, { enhanceChips: number; enhanceMul: number }> = {};

        if (this.userCardEnhancements.has(userId)) {
            const userEnhancements = this.userCardEnhancements.get(userId)!;
            for (const [cardId, enhancement] of userEnhancements) {
                enhancements[cardId] = {
                    enhanceChips: enhancement.enhanceChips,
                    enhanceMul: enhancement.enhanceMul
                };
            }
        }

        return enhancements;
    }

    // 모든 유저 데이터 완전 초기화 (새 게임 시작 시)
    resetAllUserData(): void {
        this.userLevels.clear();
        this.userCounts.clear();
        this.userBaseChips.clear();
        this.userMultipliers.clear();
        this.userCardEnhancements.clear();
    }
} 