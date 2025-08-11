import { Injectable } from '@nestjs/common';
import { CardType, CardValue, PokerHand, PokerHandResult, HandContext } from './poker-types';
import { CardData } from './deck.util';
import { PaytableService } from './paytable.service';

@Injectable()
export class HandEvaluatorService {
    constructor(private readonly paytableService: PaytableService) { }

    evaluate(userId: string, playCards: CardData[], fullCards: CardData[]): PokerHandResult {
        if (!playCards || playCards.length < 1) {
            return new PokerHandResult(
                PokerHand.None,
                0,
                0,
                [],
                [],
                PokerHand.None
            );
        }

        // 한 번만 계산하여 재사용
        const values = playCards.map(c => c.rank as CardValue).sort((a, b) => a - b);
        const suits = playCards.map(c => c.suit);

        // 값별 그룹화 (같은 값의 카드 개수로 정렬)
        const valueGroups = new Map<CardValue, number>();
        values.forEach(value => {
            valueGroups.set(value, (valueGroups.get(value) || 0) + 1);
        });
        const groups = Array.from(valueGroups.entries())
            .sort((a, b) => b[1] - a[1]); // 개수 내림차순 정렬

        const isFlush = new Set(suits).size === 1 && playCards.length === 5;
        const isStraight = this.isStraight(values);

        // 카드 인덱스 매핑용
        const usedCards: CardData[] = [];

        // Straight Flush
        if (isFlush && isStraight) {
            this.addAllCards(playCards, usedCards);
            return this.makeResult(userId, PokerHand.StraightFlush, usedCards, fullCards);
        }

        // Four of a Kind
        if (groups[0] && groups[0][1] === 4) {
            this.addCardsByValue(playCards, groups[0][0], usedCards);
            return this.makeResult(userId, PokerHand.FourOfAKind, usedCards, fullCards);
        }

        // Full House
        if (groups[0] && groups[0][1] === 3 && groups[1] && groups[1][1] === 2) {
            this.addCardsByValues(playCards, groups[0][0], groups[1][0], usedCards);
            return this.makeResult(userId, PokerHand.FullHouse, usedCards, fullCards);
        }

        // Flush
        if (isFlush) {
            this.addAllCards(playCards, usedCards);
            return this.makeResult(userId, PokerHand.Flush, usedCards, fullCards);
        }

        // Straight
        if (isStraight) {
            this.addAllCards(playCards, usedCards);
            return this.makeResult(userId, PokerHand.Straight, usedCards, fullCards);
        }

        // Three of a Kind
        if (groups[0] && groups[0][1] === 3) {
            this.addCardsByValue(playCards, groups[0][0], usedCards);
            return this.makeResult(userId, PokerHand.ThreeOfAKind, usedCards, fullCards);
        }

        // Two Pair
        if (groups[0] && groups[0][1] === 2 && groups[1] && groups[1][1] === 2) {
            this.addCardsByValues(playCards, groups[0][0], groups[1][0], usedCards);
            return this.makeResult(userId, PokerHand.TwoPair, usedCards, fullCards);
        }

        // One Pair
        if (groups[0] && groups[0][1] === 2) {
            this.addCardsByValue(playCards, groups[0][0], usedCards);
            return this.makeResult(userId, PokerHand.OnePair, usedCards, fullCards);
        }

        // High Card - 가장 높은 카드 1장만 사용
        // 카드를 rank 기준으로 내림차순 정렬하여 가장 높은 카드를 찾음
        const sortedCards = [...playCards].sort((a, b) => b.rank - a.rank);
        usedCards.push(sortedCards[0]);
        return this.makeResult(userId, PokerHand.HighCard, usedCards, fullCards);
    }

    private isStraight(values: CardValue[]): boolean {
        if (values.length < 5) return false;

        // 일반적인 스트레이트 체크
        for (let i = 0; i <= values.length - 5; i++) {
            let isConsecutive = true;
            for (let j = 0; j < 4; j++) {
                if (values[i + j + 1] - values[i + j] !== 1) {
                    isConsecutive = false;
                    break;
                }
            }
            if (isConsecutive) return true;
        }

        // A-2-3-4-5 스트레이트 체크 (A를 1로 처리)
        if (values.includes(CardValue.Ace) && values.includes(CardValue.Two)) {
            const lowStraight = [CardValue.Ace, CardValue.Two, CardValue.Three, CardValue.Four, CardValue.Five];
            const hasLowStraight = lowStraight.every(value => values.includes(value));
            if (hasLowStraight) return true;
        }

        return false;
    }

    private addCardsByValue(cards: CardData[], targetValue: CardValue, usedCards: CardData[]): void {
        for (let i = 0; i < cards.length; i++) {
            if (cards[i].rank === targetValue) {
                usedCards.push(cards[i]);
            }
        }
    }

    private addCardsByValues(cards: CardData[], value1: CardValue, value2: CardValue, usedCards: CardData[]): void {
        for (let i = 0; i < cards.length; i++) {
            if (cards[i].rank === value1 || cards[i].rank === value2) {
                usedCards.push(cards[i]);
            }
        }
    }

    private addAllCards(cards: CardData[], usedCards: CardData[]): void {
        for (let i = 0; i < cards.length; i++) {
            usedCards.push(cards[i]);
        }
    }

    private makeResult(userId: string, hand: PokerHand, usedCards: CardData[], allCards: CardData[]): PokerHandResult {
        // 사용되지 않은 카드들 계산
        const unusedCards: CardData[] = [];

        for (let i = 0; i < allCards.length; i++) {
            // usedCards에 없는 카드만 unusedCards에 추가
            const isUsed = usedCards.some(usedCard =>
                usedCard.id === allCards[i].id
            );
            if (!isUsed) {
                unusedCards.push(allCards[i]);
            }
        }

        // 사용되지 않은 카드들로 만들 수 있는 최고 족보 계산
        const unusedPokerHand = unusedCards.length > 0 ? this.evaluateUnusedCards(unusedCards) : PokerHand.None;

        return new PokerHandResult(
            hand,
            this.paytableService.getChips(userId, hand),
            this.paytableService.getMultiplier(userId, hand),
            usedCards,
            unusedCards,
            unusedPokerHand
        );
    }

    // 사용되지 않은 카드들로 만들 수 있는 최고 족보를 계산하는 메서드
    private evaluateUnusedCards(cards: CardData[]): PokerHand {
        if (cards.length < 1) return PokerHand.None;

        const values = cards.map(c => c.rank as CardValue).sort((a, b) => a - b);
        const suits = cards.map(c => c.suit);

        const valueGroups = new Map<CardValue, number>();
        values.forEach(value => {
            valueGroups.set(value, (valueGroups.get(value) || 0) + 1);
        });
        const groups = Array.from(valueGroups.entries())
            .sort((a, b) => b[1] - a[1]);

        const isFlush = new Set(suits).size === 1 && cards.length === 5;
        const isStraight = this.isStraight(values);

        if (isFlush && isStraight) return PokerHand.StraightFlush;
        if (groups[0] && groups[0][1] === 4) return PokerHand.FourOfAKind;
        if (groups[0] && groups[0][1] === 3 && groups[1] && groups[1][1] === 2) return PokerHand.FullHouse;
        if (isFlush) return PokerHand.Flush;
        if (isStraight) return PokerHand.Straight;
        if (groups[0] && groups[0][1] === 3) return PokerHand.ThreeOfAKind;
        if (groups[0] && groups[0][1] === 2 && groups[1] && groups[1][1] === 2) return PokerHand.TwoPair;
        if (groups[0] && groups[0][1] === 2) return PokerHand.OnePair;

        return PokerHand.HighCard;
    }

    // 카드 값 계산 헬퍼 메서드
    calculateCardValue(rank: number): number {
        if (rank >= 2 && rank <= 10) return rank;
        if (rank === 1) return 11; // Ace
        return 10; // J, Q, K
    }

    // HandContext 생성 헬퍼 메서드
    createHandContext(handResult: PokerHandResult, remainingDiscards: number = 0, remainingDeck: number = 0, remainingSevens: number = 0): HandContext {
        const context = new HandContext();

        if (handResult.usedCards) {
            context.playedCards.push(...handResult.usedCards);
        }

        if (handResult.unUsedCards) {
            context.unUsedCards.push(...handResult.unUsedCards);
        }

        context.multiplier = handResult.multiplier;
        context.chips = handResult.score;
        context.pokerHand = handResult.pokerHand;
        context.unUsedPokerHand = handResult.unUsedPokerHand;
        context.remainingDiscards = remainingDiscards;
        context.remainingDeck = remainingDeck;
        context.remainingSevens = remainingSevens;

        return context;
    }
} 