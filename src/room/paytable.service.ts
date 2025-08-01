import { Injectable } from '@nestjs/common';
import { PokerHand } from './poker-types';

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

    // 모든 유저 데이터 완전 초기화 (새 게임 시작 시)
    resetAllUserData(): void {
        this.userLevels.clear();
        this.userCounts.clear();
        this.userBaseChips.clear();
        this.userMultipliers.clear();
    }
} 