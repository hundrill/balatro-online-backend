import { Injectable } from '@nestjs/common';
import { HandContext, CardType, PokerHand } from './poker-types';
import { PaytableService } from './paytable.service';
import { HandEvaluatorService } from './hand-evaluator.service';

export enum SpecialCardType {
    Joker,
    Planet,
    Tarot
}

// JokerEffectTiming enum (joker-cards.util.ts에서 이동)
export enum JokerEffectTiming {
    OnScoring = 'OnScoring',
    OnHandPlay = 'OnHandPlay',
    OnAfterScoring = 'OnAfterScoring',
}

// 조커 효과 인터페이스
export interface JokerEffect {
    timing: JokerEffectTiming;
    applyEffect: (context: HandContext, self: SpecialCardData) => boolean;
}

// 특수 카드 데이터 인터페이스 (기존 SpecialCard와 호환)
export interface SpecialCard {
    type: SpecialCardType;
    id: string;
    name: string;
    description: string;
    price: number;
    sprite: number;
    baseValue?: number;
    increase?: number;
    decrease?: number;
    maxValue?: number;
    enhanceChips?: number;
    enhanceMul?: number;
    needCardCount?: number;
    isActive?: boolean;
    pokerHand?: PokerHand;

}

// 특수 카드 데이터 인터페이스 (내부용)
export interface SpecialCardData extends SpecialCard {
    effects?: JokerEffect[];
}

@Injectable()
export class SpecialCardManagerService {
    private allSpecialCards: Map<string, SpecialCardData> = new Map();

    constructor(
        private readonly paytableService: PaytableService,
        private readonly handEvaluatorService: HandEvaluatorService
    ) {
        this.initializeSpecialCards();
    }

    // 특수 카드 초기화
    private initializeSpecialCards(): void {
        // 조커 카드 등록 (1~47번)
        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_1',
            name: '조커 A',
            description: '다이아몬드로 득점 시마다 배수가 +2 된다.',
            price: 2,
            sprite: 0,
            baseValue: 2,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.currentCardData?.suit === CardType.Diamonds) {
                        context.multiplier += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_2',
            name: '조커 B',
            description: '내 플레이 카드에 페어가 포함되어있으면 배수 <color=red>+[baseValue]</color> 한다.',
            price: 3,
            sprite: 1,
            baseValue: 2,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.hasPairInPlayedCards()) {
                        context.multiplier += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_3',
            name: '조커 C',
            description: '원페어 시 x1배. 원페어가 플레이 될 때마다 x0.2배가 성장한다. (최대 30)',
            price: 5,
            sprite: 2,
            baseValue: 1,
            increase: 0.2,
            maxValue: 30,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.OnePair) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.OnePair) {
                        self.baseValue = Math.min((self.baseValue || 1) + (self.increase || 0), self.maxValue || 30);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_4',
            name: '조커 D',
            description: '투페어 시 x1배. 투페어가 플레이 될 때마다 x0.3배가 성장한다. (최대 30)',
            price: 4,
            sprite: 3,
            baseValue: 1,
            increase: 0.3,
            maxValue: 30,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.TwoPair) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.TwoPair) {
                        self.baseValue = Math.min((self.baseValue || 1) + (self.increase || 0), self.maxValue || 30);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_5',
            name: '조커 E',
            description: '트리플 시 x1배. 트리플이 플레이 될 때마다 x0.4배가 성장한다. (최대 30)',
            price: 4,
            sprite: 4,
            baseValue: 1,
            increase: 0.4,
            maxValue: 30,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.ThreeOfAKind) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.ThreeOfAKind) {
                        self.baseValue = Math.min((self.baseValue || 1) + (self.increase || 0), self.maxValue || 30);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_6',
            name: '조커 F',
            description: '포카드 시 x1배. 포카드가 플레이 될 때마다 x0.7배가 성장한다. (최대 30)',
            price: 4,
            sprite: 5,
            baseValue: 1,
            increase: 0.7,
            maxValue: 30,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.FourOfAKind) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.FourOfAKind) {
                        self.baseValue = Math.min((self.baseValue || 1) + (self.increase || 0), self.maxValue || 30);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_7',
            name: '조커 G',
            description: '풀하우스 시 x1배. 풀하우스가 플레이 될 때마다 x0.5배가 성장한다. (최대 30)',
            price: 4,
            sprite: 6,
            baseValue: 1,
            increase: 0.5,
            maxValue: 30,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.FullHouse) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.FullHouse) {
                        self.baseValue = Math.min((self.baseValue || 1) + (self.increase || 0), self.maxValue || 30);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_8',
            name: '조커 H',
            description: '하이카드 시 <color=red>x[baseValue]</color>배. 하이카드가 플레이 될 때마다 <color=green>x[increase]</color>배가 성장한다. (최대 30)',
            price: 4,
            sprite: 7,
            baseValue: 1,
            increase: 0.1,
            maxValue: 30,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.HighCard) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.HighCard) {
                        self.baseValue = Math.min((self.baseValue || 1) + (self.increase || 0), self.maxValue || 30);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_9',
            name: '조커 I',
            description: '스트레이트 시 x1배. 스트레이트가 플레이 될 때마다 x0.4배가 성장한다. (최대 30)',
            price: 4,
            sprite: 8,
            baseValue: 1,
            increase: 0.4,
            maxValue: 30,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.Straight) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.Straight) {
                        self.baseValue = Math.min((self.baseValue || 1) + (self.increase || 0), self.maxValue || 30);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_10',
            name: '조커 J',
            description: '플러시 시 x1배. 플러시가 플레이 될 때마다 x0.4배가 성장한다. (최대 30)',
            price: 4,
            sprite: 9,
            baseValue: 1,
            increase: 0.4,
            maxValue: 30,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.Flush) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.Flush) {
                        self.baseValue = Math.min((self.baseValue || 1) + (self.increase || 0), self.maxValue || 30);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_11',
            name: '조커 K',
            description: '핸드플레이 시, 내 핸드에 페어가 남아있으면 배수 <color=red>[baseValue]배</color>한다.',
            price: 4,
            sprite: 10,
            baseValue: 3,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.hasPairInUnUsedCards()) {
                        context.multiplier += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_12',
            name: '조커 L',
            description: '핸드플레이 시, 내 핸드에 트리플이 남아있으면 배수 <color=red>[baseValue]배</color>한다.',
            price: 4,
            sprite: 11,
            baseValue: 6,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.hasTripleInUnUsedCards()) {
                        context.multiplier += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_13',
            name: '조커 M',
            description: '핸드플레이 시, 내 핸드에 포 카드가 남아있으면 배수 <color=red>[baseValue]배</color>한다.',
            price: 4,
            sprite: 12,
            baseValue: 25,
            effects: [{
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.unUsedPokerHand === PokerHand.FourOfAKind) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_14',
            name: '조커 N',
            description: '내 패에 스트레이트가 포함되어있으면 배수 +4 한다.',
            price: 4,
            sprite: 13,
            baseValue: 4,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.Straight) {
                        context.multiplier += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_15',
            name: '조커 O',
            description: '무조건 배수 +1 한다.',
            price: 4,
            sprite: 14,
            baseValue: 1,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    context.multiplier += self.baseValue || 0;
                    return true;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_16',
            name: '조커 P',
            description: '내 패에 트리플이 포함되어있으면 배수 <color=red>+[baseValue]</color> 한다.',
            price: 4,
            sprite: 15,
            baseValue: 3,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.hasTripleInPlayedCards()) {
                        context.multiplier += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_17',
            name: '조커 Q',
            description: '내 패에 포카드가 포함되어있으면 배수 +5 한다.',
            price: 4,
            sprite: 16,
            baseValue: 5,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.FourOfAKind) {
                        context.multiplier += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_18',
            name: '조커 R',
            description: '내 패에 풀하우스가 포함되어있으면 배수 +4 한다.',
            price: 4,
            sprite: 17,
            baseValue: 4,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.FullHouse) {
                        context.multiplier += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_19',
            name: '조커 S',
            description: '내 패에 플러시가 포함되어있으면 배수 +4 한다.',
            price: 4,
            sprite: 18,
            baseValue: 4,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.pokerHand === PokerHand.Flush) {
                        context.multiplier += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_20',
            name: '조커 T',
            description: '하트로 득점 시마다, 해당 카드의 득점 시 칩스가 +10 성장한다.',
            price: 2,
            sprite: 19,
            baseValue: 10,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.currentCardData?.suit === CardType.Hearts) {
                        context.chips += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_21',
            name: '조커 U',
            description: '스페이드로 득점 시마다, 해당 카드의 득점 시 칩스가 +10 성장한다.',
            price: 2,
            sprite: 20,
            baseValue: 10,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.currentCardData?.suit === CardType.Spades) {
                        context.chips += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_22',
            name: '조커 V',
            description: '클럽으로 득점 시마다, 해당 카드의 득점 시 칩스가 +10 성장한다.',
            price: 2,
            sprite: 21,
            baseValue: 10,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.currentCardData?.suit === CardType.Clubs) {
                        context.chips += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_23',
            name: '조커 W',
            description: '핸드플레이 시, 내 핸드에 하트가 남아있는 카드 한 장당 배수가 +2 된다.',
            price: 2,
            sprite: 22,
            baseValue: 2,
            effects: [{
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    const heartCount = context.countUnUsedCardsOfSuit(CardType.Hearts);
                    if (heartCount > 0) {
                        context.multiplier += heartCount * (self.baseValue || 0);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_24',
            name: '조커 X',
            description: '핸드플레이 시, 내 핸드에 스페이드가 남아있는 카드 한 장당 배수가 +2 된다.',
            price: 2,
            sprite: 23,
            baseValue: 2,
            effects: [{
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    const spadeCount = context.countUnUsedCardsOfSuit(CardType.Spades);
                    if (spadeCount > 0) {
                        context.multiplier += spadeCount * (self.baseValue || 0);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_25',
            name: '조커 Y',
            description: '핸드플레이 시, 내 핸드에 클럽이 남아있는 카드 한 장당 배수가 +2 된다.',
            price: 2,
            sprite: 24,
            baseValue: 2,
            effects: [{
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    const clubCount = context.countUnUsedCardsOfSuit(CardType.Clubs);
                    if (clubCount > 0) {
                        context.multiplier += clubCount * (self.baseValue || 0);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_26',
            name: '조커 Z',
            description: '핸드플레이 시, 내 핸드에 다이아몬드가 남아있는 카드 한 장당 배수가 +2 된다.',
            price: 2,
            sprite: 25,
            baseValue: 2,
            effects: [{
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    const diamondCount = context.countUnUsedCardsOfSuit(CardType.Diamonds);
                    if (diamondCount > 0) {
                        context.multiplier += diamondCount * (self.baseValue || 0);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_27',
            name: '조커 AA',
            description: '득점에 사용된 에이스 한 장당, 칩스 +20 배수 +4 된다.',
            price: 4,
            sprite: 26,
            baseValue: 0,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    const aceCount = context.countAcesInUsedCards();
                    if (aceCount > 0) {
                        context.chips += 20 * aceCount;
                        context.multiplier += 4 * aceCount;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_28',
            name: '조커 AB',
            description: '배수 +20. 라운드 종료 시 마다 배수가 -4 된다.',
            price: 4,
            sprite: 27,
            baseValue: 20,
            decrease: 4,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    context.multiplier += self.baseValue || 0;
                    return true;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    self.baseValue = Math.max(-10000, (self.baseValue || 0) - (self.decrease || 0));
                    return true;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_29',
            name: '조커 AC',
            description: '칩스 +0. 득점한 모든 카드의 득점 시 칩스가 +3 성장한다.',
            price: 4,
            sprite: 28,
            baseValue: 0,
            increase: 3,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    self.baseValue = (self.baseValue || 0) + (self.increase || 0);
                    context.chips += self.baseValue || 0;
                    return true;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_30',
            name: '조커 AD',
            description: '전체 덱에 보유한 7 한장 당 배수가 +2 된다.',
            price: 4,
            sprite: 29,
            baseValue: 2,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.remainingSevens && context.remainingSevens > 0) {
                        context.multiplier += context.remainingSevens * (self.baseValue || 0);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_31',
            name: '조커 AE',
            description: '전체 덱카드가 52장 보다 적으면, 그 차이 당 배수가 +4 된다.',
            price: 4,
            sprite: 30,
            baseValue: 4,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.remainingDeck && context.remainingDeck > 0) {
                        context.multiplier += context.remainingDeck * (self.baseValue || 0);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_32',
            name: '조커 AF',
            description: '스페이드 카드로 득점 시 배수 x1 스페이드 카드 득점 시마다 배수가 1 성장한다. 다른 카드 득점 시마다 배수가 2 감퇴한다.',
            price: 4,
            sprite: 31,
            baseValue: 1,
            increase: 1,
            decrease: 2,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.currentCardData?.suit === CardType.Spades) {
                        self.baseValue = (self.baseValue || 1) + (self.increase || 0);
                    } else {
                        self.baseValue = Math.max(-10000, (self.baseValue || 1) - (self.decrease || 0));
                    }
                    return true;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    const spadeCount = context.countSuitInUsedCards(CardType.Spades);
                    if (spadeCount > 0) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_33',
            name: '조커 AG',
            description: '다이아 카드로 득점 시 배수 x1 다이아 카드 득점 시마다 배수가 1 성장한다. 다른 카드 득점 시마다 배수가 2 감퇴한다.',
            price: 4,
            sprite: 32,
            baseValue: 1,
            increase: 1,
            decrease: 2,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.currentCardData?.suit === CardType.Diamonds) {
                        self.baseValue = (self.baseValue || 1) + (self.increase || 0);
                    } else {
                        self.baseValue = Math.max(-10000, (self.baseValue || 1) - (self.decrease || 0));
                    }
                    return true;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    const diamondCount = context.countSuitInUsedCards(CardType.Diamonds);
                    if (diamondCount > 0) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_34',
            name: '조커 AH',
            description: '하트 카드로 득점 시 배수 x1 하트 카드 득점 시마다 배수가 1 성장한다. 다른 카드 득점 시마다 배수가 2 감퇴한다.',
            price: 4,
            sprite: 33,
            baseValue: 1,
            increase: 1,
            decrease: 2,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.currentCardData?.suit === CardType.Hearts) {
                        self.baseValue = (self.baseValue || 1) + (self.increase || 0);
                    } else {
                        self.baseValue = Math.max(-10000, (self.baseValue || 1) - (self.decrease || 0));
                    }
                    return true;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    const heartCount = context.countSuitInUsedCards(CardType.Hearts);
                    if (heartCount > 0) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_35',
            name: '조커 AI',
            description: '클럽 카드로 득점 시 배수 x1 클럽 카드 득점 시마다 배수가 1 성장한다. 다른 카드 득점 시마다 배수가 2 감퇴한다.',
            price: 4,
            sprite: 34,
            baseValue: 1,
            increase: 1,
            decrease: 2,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.currentCardData?.suit === CardType.Clubs) {
                        self.baseValue = (self.baseValue || 1) + (self.increase || 0);
                    } else {
                        self.baseValue = Math.max(-10000, (self.baseValue || 1) - (self.decrease || 0));
                    }
                    return true;
                }
            }, {
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    const clubCount = context.countSuitInUsedCards(CardType.Clubs);
                    if (clubCount > 0) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_36',
            name: '조커 AJ',
            description: '스페이드 1장으로 플레이 시, 칩스 x20 된다.',
            price: 4,
            sprite: 35,
            baseValue: 20,
            effects: [{
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.isUsedCardsOfSuitCount(CardType.Spades, 1)) {
                        context.chips *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_37',
            name: '조커 AK',
            description: '다이아몬드 4장으로 득점 시, 배수 x12 된다.',
            price: 4,
            sprite: 36,
            baseValue: 12,
            effects: [{
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.isUsedCardsOfSuitCount(CardType.Diamonds, 4)) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_38',
            name: '조커 AL',
            description: '하트 2장으로 득점 시, 배수 x18 된다.',
            price: 4,
            sprite: 37,
            baseValue: 18,
            effects: [{
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.isUsedCardsOfSuitCount(CardType.Hearts, 2)) {
                        context.multiplier *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_39',
            name: '조커 AM',
            description: '클럽 3장으로 득점 시, 칩스 x15 된다.',
            price: 4,
            sprite: 38,
            baseValue: 15,
            effects: [{
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.isUsedCardsOfSuitCount(CardType.Clubs, 3)) {
                        context.chips *= self.baseValue || 1;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_40',
            name: '조커 AN',
            description: '왼쪽 조커와 동일한 기능을 한다. (레벨은 자신의 레벨로 적용된다.).....작업 중...',
            price: 4,
            sprite: 39,
            baseValue: 0,
            effects: [{
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    // TODO: 왼쪽 조커 효과 구현
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_41',
            name: '조커 AO',
            description: '남은 버리기 1 당 칩스가 +20 된다.',
            price: 5,
            sprite: 40,
            baseValue: 20,
            effects: [{
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.remainingDiscards && context.remainingDiscards > 0) {
                        context.chips += context.remainingDiscards * (self.baseValue || 0);
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_42',
            name: '조커 AP',
            description: '제거 예정.......남은 핸드플레이 1 당 배수가 +2, 칩스는 -30 된다.',
            price: 5,
            sprite: 41,
            baseValue: 0,
            effects: [] // 효과 없음
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_43',
            name: '조커 AQ',
            description: '버리기가 0번 남았을 때 배수가 +15 된다.',
            price: 5,
            sprite: 42,
            baseValue: 15,
            effects: [{
                timing: JokerEffectTiming.OnAfterScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.remainingDiscards && context.remainingDiscards <= 0) {
                        context.multiplier += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_44',
            name: '조커 AR',
            description: '랜덤으로 배수가 +2 ~ 20 된다.',
            price: 5,
            sprite: 43,
            baseValue: 2,
            increase: 20,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    const randomMultiplier = Math.floor(Math.random() * ((self.increase || 20) - (self.baseValue || 2) + 1)) + (self.baseValue || 2);
                    context.multiplier += randomMultiplier;
                    context.randomValue = randomMultiplier;
                    return true;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_45',
            name: '조커 AS',
            description: '짝수 카드 점수 시 마다, 배수 +2 된다.',
            price: 5,
            sprite: 44,
            baseValue: 2,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.isCurrentCardDataEvenRank()) {
                        context.multiplier += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_46',
            name: '조커 AU',
            description: '홀수 카드 점수 시 마다, 배수 +2 된다.',
            price: 5,
            sprite: 45,
            baseValue: 2,
            effects: [{
                timing: JokerEffectTiming.OnScoring,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (!context.isCurrentCardDataEvenRank()) {
                        context.multiplier += self.baseValue || 0;
                        return true;
                    }
                    return false;
                }
            }]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_47',
            name: '조커 AV',
            description: '덱에 남아 있는 카드 1장 당 칩스가 +2 된다.',
            price: 5,
            sprite: 46,
            baseValue: 2,
            effects: [{
                timing: JokerEffectTiming.OnHandPlay,
                applyEffect: (context: HandContext, self: SpecialCardData) => {
                    if (context.remainingDeck && context.remainingDeck > 0) {
                        context.chips += context.remainingDeck * (self.baseValue || 0);
                        return true;
                    }
                    return false;
                }
            }]
        });

        // 행성 카드 등록
        this.registerSpecialCard({
            type: SpecialCardType.Planet,
            id: 'planet_1',
            name: '명왕성',
            description: '(Lv.[level])하이카드를 레벨업 합니다\n +1 배수 \n+10 칩스',
            price: 3,
            sprite: 0,
            enhanceChips: 10,
            enhanceMul: 1,
            pokerHand: PokerHand.HighCard
        });

        this.registerSpecialCard({
            type: SpecialCardType.Planet,
            id: 'planet_2',
            name: '수성',
            description: '(Lv.[level])페어를 레벨업 합니다\n +1 배수 \n+15 칩스',
            price: 3,
            sprite: 1,
            enhanceChips: 15,
            enhanceMul: 1,
            pokerHand: PokerHand.OnePair
        });

        this.registerSpecialCard({
            type: SpecialCardType.Planet,
            id: 'planet_3',
            name: '천왕성',
            description: '(Lv.[level])투페어를 레벨업 합니다\n +3 배수 \n+30 칩스',
            price: 3,
            sprite: 7,
            enhanceChips: 30,
            enhanceMul: 3,
            pokerHand: PokerHand.TwoPair
        });

        this.registerSpecialCard({
            type: SpecialCardType.Planet,
            id: 'planet_4',
            name: '금성',
            description: '(Lv.[level])트리플를 레벨업 합니다\n +1 배수 \n+20 칩스',
            price: 3,
            sprite: 2,
            enhanceChips: 20,
            enhanceMul: 1,
            pokerHand: PokerHand.ThreeOfAKind
        });

        this.registerSpecialCard({
            type: SpecialCardType.Planet,
            id: 'planet_5',
            name: '토성',
            description: '(Lv.[level])스트레이트를 레벨업 합니다\n +3 배수 \n+15 칩스',
            price: 3,
            sprite: 6,
            enhanceChips: 15,
            enhanceMul: 3,
            pokerHand: PokerHand.Straight
        });

        this.registerSpecialCard({
            type: SpecialCardType.Planet,
            id: 'planet_6',
            name: '목성',
            description: '(Lv.[level])플러쉬를 레벨업 합니다\n +2 배수 \n+15 칩스',
            price: 3,
            sprite: 5,
            enhanceChips: 15,
            enhanceMul: 2,
            pokerHand: PokerHand.Flush
        });

        this.registerSpecialCard({
            type: SpecialCardType.Planet,
            id: 'planet_7',
            name: '지구',
            description: '(Lv.[level])풀하우스를 레벨업 합니다\n +2 배수 \n+20 칩스',
            price: 3,
            sprite: 3,
            enhanceChips: 20,
            enhanceMul: 2,
            pokerHand: PokerHand.FullHouse
        });

        this.registerSpecialCard({
            type: SpecialCardType.Planet,
            id: 'planet_8',
            name: '화성',
            description: '(Lv.[level])포카드를 레벨업 합니다\n +3 배수 \n+30 칩스',
            price: 3,
            sprite: 4,
            enhanceChips: 30,
            enhanceMul: 3,
            pokerHand: PokerHand.FourOfAKind
        });

        this.registerSpecialCard({
            type: SpecialCardType.Planet,
            id: 'planet_9',
            name: '해왕성',
            description: '(Lv.[level])스트레이트 플러쉬를 레벨업 합니다\n +4 배수 \n+40 칩스',
            price: 3,
            sprite: 8,
            enhanceChips: 40,
            enhanceMul: 4,
            pokerHand: PokerHand.StraightFlush
        });

        // 타로 카드 등록
        this.registerSpecialCard({
            type: SpecialCardType.Tarot,
            id: 'tarot_1',
            name: '타로 A',
            description: '선택한 3장의 카드의 숫자가 1 상승한다.',
            price: 2,
            sprite: 0,
            needCardCount: 3
        });

        this.registerSpecialCard({
            type: SpecialCardType.Tarot,
            id: 'tarot_2',
            name: '타로 B',
            description: '선택한 3장의 카드의 숫자가 2 감소한다.',
            price: 3,
            sprite: 1,
            needCardCount: 3
        });

        this.registerSpecialCard({
            type: SpecialCardType.Tarot,
            id: 'tarot_3',
            name: '타로 C',
            description: '5장의 무작위 카드가 선택되고, 모두 한 가지 무늬로 변경된다.',
            price: 5,
            sprite: 2,
            needCardCount: 5
        });

        this.registerSpecialCard({
            type: SpecialCardType.Tarot,
            id: 'tarot_4',
            name: '타로 D',
            description: '선택한 2장의 카드가 스페이드로 변경된다.',
            price: 4,
            sprite: 3,
            needCardCount: 2
        });

        this.registerSpecialCard({
            type: SpecialCardType.Tarot,
            id: 'tarot_5',
            name: '타로 E',
            description: '선택한 2장의 카드가 다이아로 변경된다.',
            price: 4,
            sprite: 4,
            needCardCount: 2
        });

        this.registerSpecialCard({
            type: SpecialCardType.Tarot,
            id: 'tarot_6',
            name: '타로 F',
            description: '선택한 2장의 카드가 하트로 변경된다.',
            price: 4,
            sprite: 5,
            needCardCount: 2
        });

        this.registerSpecialCard({
            type: SpecialCardType.Tarot,
            id: 'tarot_7',
            name: '타로 G',
            description: '선택한 2장의 카드가 클로버로 변경된다.',
            price: 4,
            sprite: 6,
            needCardCount: 2
        });

        this.registerSpecialCard({
            type: SpecialCardType.Tarot,
            id: 'tarot_8',
            name: '타로 H',
            description: '선택한 2장의 카드를 덱에서 삭제한다.',
            price: 6,
            sprite: 7,
            needCardCount: 2
        });

        this.registerSpecialCard({
            type: SpecialCardType.Tarot,
            id: 'tarot_9',
            name: '타로 I',
            description: '선택한 3장의 카드 중, 무작위 1장의 카드를 복제한다.',
            price: 5,
            sprite: 8,
            needCardCount: 3
        });

        this.registerSpecialCard({
            type: SpecialCardType.Tarot,
            id: 'tarot_10',
            name: '타로 J',
            description: '무작위 행성 카드를 생성한다.',
            price: 5,
            sprite: 9,
            needCardCount: 0
        });
    }

    private registerSpecialCard(cardData: SpecialCardData): void {
        this.allSpecialCards.set(cardData.id, cardData);
    }

    // ID로 특수 카드 가져오기 (새로운 인스턴스 반환)
    getCardById(id: string): SpecialCardData | null {
        const card = this.allSpecialCards.get(id);
        if (!card) return null;

        // 새로운 인스턴스 반환 (참조 문제 방지)
        return {
            ...card,
            effects: card.effects ? [...card.effects] : undefined
        };
    }

    // 조커 효과 적용
    applyJokerEffects(timing: JokerEffectTiming, context: HandContext, ownedJokers: string[]): boolean {
        let isApplied = false;

        for (const jokerId of ownedJokers) {
            const jokerData = this.getCardById(jokerId);
            if (!jokerData || !jokerData.effects) continue;

            for (const effect of jokerData.effects) {
                if (effect.timing === timing) {
                    const wasApplied = effect.applyEffect(context, jokerData);
                    if (wasApplied) {
                        isApplied = true;
                    }
                }
            }
        }

        return isApplied;
    }

    // 전체 점수 계산 시퀀스 (클라이언트의 ShowHandPlayCardsSequence와 동일)
    calculateFinalScore(
        userId: string,
        handResult: any,
        ownedJokers: string[],
        remainingDiscards: number = 0,
        remainingDeck: number = 0,
        remainingSevens: number = 0
    ): { finalChips: number; finalMultiplier: number; context: HandContext } {
        // HandContext 생성
        const context = this.handEvaluatorService.createHandContext(
            handResult,
            remainingDiscards,
            remainingDeck,
            remainingSevens
        );

        // OnHandPlay 효과 적용
        this.applyJokerEffects(JokerEffectTiming.OnHandPlay, context, ownedJokers);

        // 카드별 점수 계산 및 OnScoring 효과 적용 (handResult.usedCards에 포함된 카드만)
        console.log(`\x1b[36m[SCORING_DEBUG] context.playedCards 개수: ${context.playedCards.length}\x1b[0m`);
        console.log(`\x1b[36m[SCORING_DEBUG] handResult.usedCards 개수: ${handResult?.usedCards?.length || 0}\x1b[0m`);

        for (const card of context.playedCards) {
            console.log(`\x1b[33m[SCORING_DEBUG] 처리 중인 카드: ${card.suit}${card.rank}(id:${card.id})\x1b[0m`);

            // handResult.usedCards에 해당 카드가 포함되지 않은 경우 continue (id로 비교)
            const isUsed = handResult?.usedCards?.some((usedCard: any) => usedCard.id === card.id);
            console.log(`\x1b[35m[SCORING_DEBUG] 카드 ${card.id}가 usedCards에 포함됨: ${isUsed}\x1b[0m`);

            if (handResult?.usedCards && !isUsed) {
                console.log(`\x1b[31m[SCORING_DEBUG] 카드 ${card.id} 제외됨 (continue)\x1b[0m`);
                continue;
            }

            console.log(`\x1b[32m[SCORING_DEBUG] 카드 ${card.id} 점수 계산 진행\x1b[0m`);
            const cardValue = this.handEvaluatorService.calculateCardValue(card.rank);
            context.chips += cardValue;
            context.currentCardData = card;

            this.applyJokerEffects(JokerEffectTiming.OnScoring, context, ownedJokers);
        }

        // OnAfterScoring 효과 적용
        this.applyJokerEffects(JokerEffectTiming.OnAfterScoring, context, ownedJokers);

        return {
            finalChips: context.chips,
            finalMultiplier: context.multiplier,
            context: context
        };
    }

    // 특수 카드 목록 가져오기
    getAllSpecialCards(): { jokerCards: SpecialCard[], planetCards: SpecialCard[], tarotCards: SpecialCard[] } {
        const all = Array.from(this.allSpecialCards.values());
        return {
            jokerCards: all.filter(card => card.type === SpecialCardType.Joker),
            planetCards: all.filter(card => card.type === SpecialCardType.Planet),
            tarotCards: all.filter(card => card.type === SpecialCardType.Tarot),
        };
    }

    // 활성화된 특수 카드만 가져오기
    getActiveSpecialCards(): SpecialCardData[] {
        return Array.from(this.allSpecialCards.values())
            .filter(card => card.isActive !== false);
    }

    // 기존 joker-cards.util.ts 함수들을 대체하는 메서드들
    getRandomShopCards(count: number, usedJokerCardIds: Set<string> = new Set()): SpecialCard[] {
        /*
        // 🧪 테스트용: joker_24만 뽑히도록 임시 수정
        // TODO: 테스트 완료 후 아래 주석 처리된 원본 코드로 복구
        const joker24 = this.getCardById('joker_39');
        if (joker24) {
            return [joker24, joker24, joker24, joker24, joker24]; // 5개 모두 joker_24로 채움
        }
        return [];
        */

        // 원본 코드 (테스트 후 복구용)
        const result: SpecialCard[] = [];

        // 조커 카드 3개 랜덤 선택 (이미 사용된 조커 카드 제외)
        const activeJokers = this.getActiveSpecialCards()
            .filter(card => card.type === SpecialCardType.Joker && !usedJokerCardIds.has(card.id));
        const selectedJokers = this.getRandomCardsFromPool(activeJokers, 3);
        result.push(...selectedJokers);

        // 행성 카드 1개 랜덤 선택
        const activePlanets = this.getActiveSpecialCards()
            .filter(card => card.type === SpecialCardType.Planet);
        const selectedPlanets = this.getRandomCardsFromPool(activePlanets, 1);
        result.push(...selectedPlanets);

        // 타로 카드 1개 랜덤 선택
        const activeTarots = this.getActiveSpecialCards()
            .filter(card => card.type === SpecialCardType.Tarot);
        const selectedTarots = this.getRandomCardsFromPool(activeTarots, 1);
        result.push(...selectedTarots);

        return result;
    }

    // 카드 풀에서 랜덤하게 선택하는 헬퍼 함수
    private getRandomCardsFromPool(cardPool: SpecialCardData[], count: number): SpecialCard[] {
        const result: SpecialCard[] = [];
        const tempPool = [...cardPool];

        for (let i = 0; i < Math.min(count, tempPool.length); i++) {
            const idx = Math.floor(Math.random() * tempPool.length);
            result.push(tempPool[idx]);
            tempPool.splice(idx, 1);
        }

        return result;
    }

    getRandomPlanetCards(count: number): SpecialCard[] {
        const activeCards = this.getActiveSpecialCards()
            .filter(card => card.type === SpecialCardType.Planet);
        const result: SpecialCard[] = [];
        const tempPool = [...activeCards];

        for (let i = 0; i < Math.min(count, tempPool.length); i++) {
            const idx = Math.floor(Math.random() * tempPool.length);
            result.push(tempPool[idx]);
            tempPool.splice(idx, 1);
        }

        return result;
    }

    isJokerCard(cardId: string): boolean {
        return this.getCardById(cardId)?.type === SpecialCardType.Joker;
    }

    isTarotCard(cardId: string): boolean {
        return this.getCardById(cardId)?.type === SpecialCardType.Tarot;
    }

    isPlanetCard(cardId: string): boolean {
        return this.getCardById(cardId)?.type === SpecialCardType.Planet;
    }

    // DB에서 카드 불러오기용
    public async initializeCards(prisma: any): Promise<void> {
        try {
            console.log('[SpecialCardManagerService] DB에서 카드 데이터 로드 시작...');

            // DB에서 모든 카드 데이터 가져오기
            const dbCards = await prisma.specialCard.findMany();

            if (dbCards.length === 0) {
                console.log('[SpecialCardManagerService] DB에 카드 데이터가 없습니다. 초기 데이터를 삽입합니다...');
                await this.insertInitialCardsToDB(prisma);
                return;
            }

            // DB 데이터로 메모리 카드 업데이트
            let updatedCount = 0;
            for (const dbCard of dbCards) {
                const existingCard = this.allSpecialCards.get(dbCard.id);
                if (existingCard) {
                    // 기존 카드 데이터 업데이트 (DB 값으로 덮어쓰기)
                    existingCard.name = dbCard.name;
                    existingCard.description = dbCard.description;
                    existingCard.price = dbCard.price;
                    existingCard.sprite = dbCard.sprite;
                    existingCard.baseValue = dbCard.basevalue;
                    existingCard.increase = dbCard.increase;
                    existingCard.decrease = dbCard.decrease;
                    existingCard.maxValue = dbCard.maxvalue;
                    existingCard.enhanceChips = dbCard.enhanceChips;
                    existingCard.enhanceMul = dbCard.enhanceMul;
                    existingCard.needCardCount = dbCard.need_card_count;
                    existingCard.isActive = dbCard.isActive !== false; // 기본값 true

                    updatedCount++;

                    // 앞 5개 카드만 로그로 출력
                    if (updatedCount <= 5) {
                        console.log(`[SpecialCardManagerService] 로드된 카드 ${updatedCount}: ${dbCard.id} - ${dbCard.name} (가격: ${dbCard.price}, 활성: ${dbCard.isActive})`);
                    }
                }
            }

            console.log(`[SpecialCardManagerService] DB에서 ${updatedCount}개의 카드 데이터를 로드하여 메모리를 업데이트했습니다.`);

            // 전체 카드 타입별 통계 출력
            const jokerCount = Array.from(this.allSpecialCards.values()).filter(card => card.type === SpecialCardType.Joker && card.isActive !== false).length;
            const planetCount = Array.from(this.allSpecialCards.values()).filter(card => card.type === SpecialCardType.Planet && card.isActive !== false).length;
            const tarotCount = Array.from(this.allSpecialCards.values()).filter(card => card.type === SpecialCardType.Tarot && card.isActive !== false).length;

            console.log(`[SpecialCardManagerService] 활성 카드 통계 - 조커: ${jokerCount}개, 행성: ${planetCount}개, 타로: ${tarotCount}개`);

        } catch (error) {
            console.error('[SpecialCardManagerService] DB에서 카드 데이터 로드 실패:', error);
        }
    }

    // 초기 카드 데이터를 DB에 삽입하는 메서드
    private async insertInitialCardsToDB(prisma: any): Promise<void> {
        try {
            const allCards = Array.from(this.allSpecialCards.values());

            for (const card of allCards) {
                await prisma.specialCard.create({
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
                        isActive: card.isActive !== false,
                    }
                });
            }

            console.log(`[SpecialCardManagerService] ${allCards.length}개의 초기 카드 데이터를 DB에 삽입했습니다.`);
        } catch (error) {
            console.error('[SpecialCardManagerService] 초기 카드 데이터 삽입 실패:', error);
        }
    }
} 