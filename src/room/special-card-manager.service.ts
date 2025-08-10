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

// 효과 타입 정의 (클라이언트와 동일)
export enum EffectType {
    AddMultiplier,
    AddMultiplierByRandomValue,
    MulMultiplier,

    AddChips,
    MulChips,

    GrowBaseValue,
    DecrementBaseValue
}

// 연산자 타입 정의
export enum OperatorType {
    None,
    Equals,
    GreaterOrEqual,
    LessOrEqual
}

// 조건 타입 정의 (클라이언트와 동일)
export enum ConditionType {
    CardSuit,           // 카드 무늬
    CardRank,           // 카드 숫자
    HandType,           // 핸드 종류
    HasPair,            // 페어 포함 여부
    HasTriple,          // 트리플 포함 여부
    HasPairInUnUsed,    // 미사용 카드에 페어 포함 여부
    HasTripleInUnUsed,  // 미사용 카드에 트리플 포함 여부
    UnUsedHandType,     // 미사용 카드 핸드 종류
    UnUsedSuitCount,    // 미사용 카드 특정 무늬 개수
    UsedAceCount,       // 사용된 에이스 개수
    RemainingSevens,    // 남은 7 카드 개수
    RemainingDeck,      // 남은 덱 카드 개수
    UsedSuitCount,      // 사용된 특정 무늬 카드 개수
    RemainingDiscards,  // 남은 버리기 횟수
    IsEvenCard,         // 짝수 카드 여부
    IsOddCard,         // 홀수 카드 여부
    Always              // 항상 참
}

// ===== Enum parsing helpers (convert DB strings to enum values) =====
function parseConditionType(value: string | null | undefined): ConditionType | undefined {
    switch (value) {
        case 'CardSuit': return ConditionType.CardSuit;
        case 'CardRank': return ConditionType.CardRank;
        case 'HandType': return ConditionType.HandType;
        case 'HasPair': return ConditionType.HasPair;
        case 'HasTriple': return ConditionType.HasTriple;
        case 'HasPairInUnUsed': return ConditionType.HasPairInUnUsed;
        case 'HasTripleInUnUsed': return ConditionType.HasTripleInUnUsed;
        case 'UnUsedHandType': return ConditionType.UnUsedHandType;
        case 'UnUsedSuitCount': return ConditionType.UnUsedSuitCount;
        case 'UsedAceCount': return ConditionType.UsedAceCount;
        case 'RemainingSevens': return ConditionType.RemainingSevens;
        case 'RemainingDeck': return ConditionType.RemainingDeck;
        case 'UsedSuitCount': return ConditionType.UsedSuitCount;
        case 'RemainingDiscards': return ConditionType.RemainingDiscards;
        case 'IsEvenCard': return ConditionType.IsEvenCard;
        case 'IsOddCard': return ConditionType.IsOddCard;
        case 'Always': return ConditionType.Always;
        default: return undefined;
    }
}

function parseOperatorType(value: string | null | undefined): OperatorType {
    switch (value) {
        case 'Equals': return OperatorType.Equals;
        case 'GreaterOrEqual': return OperatorType.GreaterOrEqual;
        case 'LessOrEqual': return OperatorType.LessOrEqual;
        default: return OperatorType.None;
    }
}

function parseEffectType(value: string | null | undefined): EffectType | undefined {
    switch (value) {
        case 'AddMultiplier': return EffectType.AddMultiplier;
        case 'AddMultiplierByRandomValue': return EffectType.AddMultiplierByRandomValue;
        case 'MulMultiplier': return EffectType.MulMultiplier;
        case 'AddChips': return EffectType.AddChips;
        case 'MulChips': return EffectType.MulChips;
        case 'GrowBaseValue': return EffectType.GrowBaseValue;
        case 'DecrementBaseValue': return EffectType.DecrementBaseValue;
        default: return undefined;
    }
}

function parseJokerEffectTiming(value: string | null | undefined): JokerEffectTiming | undefined {
    switch (value) {
        case 'OnScoring': return JokerEffectTiming.OnScoring;
        case 'OnHandPlay': return JokerEffectTiming.OnHandPlay;
        case 'OnAfterScoring': return JokerEffectTiming.OnAfterScoring;
        default: return undefined;
    }
}

// 조건 데이터 구조 (클라이언트와 동일)
export interface EffectCondition {
    type: ConditionType;
    value: string;        // 조건 값 (예: "Diamonds", "OnePair", "joker_1")
    operatorType: OperatorType; // 연산자 (enum으로 타입 안전성 강화)
    numericValue: number;  // 수치 비교용 값
}

// 효과 데이터 구조 (클라이언트와 동일)
export interface EffectData {
    effectType: EffectType;   // 효과 타입 (enum으로 타입 안전성 강화)
    effectOnCard: boolean;   // true: 카드에 효과, false: 조커에 효과 (기본값: 조커)
    conditionValue: string;
}

// Prisma SpecialCard 모델과 호환되는 타입
export interface SpecialCard {
    id: string;
    name: string;
    description: string | null;
    price: number;
    sprite: number;
    type: string;
    basevalue: number | null;
    increase: number | null;
    decrease: number | null;
    maxvalue: number | null;
    need_card_count: number | null;
    enhanceChips: number | null;
    enhanceMul: number | null;
    isActive: boolean;

    // 2개 고정 조건-효과 시스템 필드들
    conditionType1: string | null;
    conditionValue1: string | null;
    conditionOperator1: string | null;
    conditionNumeric1: number | null;
    effectTiming1: string | null;
    effectType1: string | null;
    effectTarget1: string | null;

    conditionType2: string | null;
    conditionValue2: string | null;
    conditionOperator2: string | null;
    conditionNumeric2: number | null;
    effectTiming2: string | null;
    effectType2: string | null;
    effectTarget2: string | null;

    createdAt: Date;
    updatedAt: Date;
}

export interface SpecialCardData {
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

    // 다중 타이밍/효과 지원 필드들 (클라이언트와 동일)
    effectTimings?: JokerEffectTiming[];     // 여러 타이밍을 저장
    effectTypes?: EffectType[];              // 여러 효과 타입을 저장 (enum으로 타입 안전성 강화)
    effectOnCards?: boolean[];               // 각 효과의 대상들
    conditionTypes?: ConditionType[];        // 여러 조건 타입을 저장
    conditionValues?: string[];              // 각 조건의 값들
    conditionOperators?: OperatorType[];     // 각 조건의 연산자들 (enum으로 타입 안전성 강화)
    conditionNumericValues?: number[];       // 각 조건의 수치값들
}

// 조건 평가기 (클라이언트와 동일)
export class ConditionEvaluator {
    private static getCardTypeFromString(suitString: string): CardType {
        switch (suitString) {
            case "Hearts": return CardType.Hearts;
            case "Diamonds": return CardType.Diamonds;
            case "Clubs": return CardType.Clubs;
            case "Spades": return CardType.Spades;
            default: return CardType.Hearts;
        }
    }

    static evaluateConditions(conditions: EffectCondition[], context: HandContext, cardData: SpecialCardData): boolean {
        if (!conditions || conditions.length === 0)
            return true; // 조건이 없으면 항상 참

        for (const condition of conditions) {
            if (!this.evaluateCondition(condition, context, cardData))
                return false;
        }
        return true;
    }

    static evaluateCondition(condition: EffectCondition, context: HandContext, cardData: SpecialCardData): boolean {
        switch (condition.type) {
            case ConditionType.CardSuit:
                const targetSuit = this.getCardTypeFromString(condition.value);
                return context.currentCardData?.suit === targetSuit;

            case ConditionType.CardRank:
                return context.currentCardData?.rank.toString() === condition.value;

            case ConditionType.HandType:
                return context.pokerHand === condition.value;

            case ConditionType.HasPair:
                return context.hasPairInPlayedCards();

            case ConditionType.HasTriple:
                return context.hasTripleInPlayedCards();

            case ConditionType.HasPairInUnUsed:
                return context.hasPairInUnUsedCards();

            case ConditionType.HasTripleInUnUsed:
                return context.hasTripleInUnUsedCards();

            case ConditionType.UnUsedHandType:
                return context.unUsedHandType === condition.value;

            case ConditionType.UnUsedSuitCount:
                const suitType = this.getCardTypeFromString(condition.value);
                return this.compareNumeric(context.countUnUsedCardsOfSuit(suitType), condition.operatorType, condition.numericValue);

            case ConditionType.UsedAceCount:
                return this.compareNumeric(context.countAcesInUsedCards(), condition.operatorType, condition.numericValue);

            case ConditionType.RemainingSevens:
                return this.compareNumeric(context.remainingSevens, condition.operatorType, condition.numericValue);

            case ConditionType.RemainingDeck:
                return this.compareNumeric(context.remainingDeck, condition.operatorType, condition.numericValue);

            case ConditionType.UsedSuitCount:
                return this.compareNumeric(context.countSuitInUsedCards(this.getCardTypeFromString(condition.value)), condition.operatorType, condition.numericValue);

            case ConditionType.RemainingDiscards:
                return this.compareNumeric(context.remainingDiscards, condition.operatorType, condition.numericValue);

            case ConditionType.IsEvenCard:
                return context.isCurrentCardDataEvenRank();

            case ConditionType.IsOddCard:
                return !context.isCurrentCardDataEvenRank();

            case ConditionType.Always:
                return true;

            default:
                return false;
        }
    }

    private static compareNumeric(actual: number, operatorType: OperatorType, expected: number): boolean {
        switch (operatorType) {
            case OperatorType.Equals: return actual === expected;
            case OperatorType.GreaterOrEqual: return actual >= expected;
            case OperatorType.LessOrEqual: return actual <= expected;
            default: return false;
        }
    }
}

// 효과 적용기 (클라이언트와 동일)
export class EffectApplier {
    private static getCardTypeFromString(suitString: string): CardType {
        switch (suitString) {
            case "Hearts": return CardType.Hearts;
            case "Diamonds": return CardType.Diamonds;
            case "Clubs": return CardType.Clubs;
            case "Spades": return CardType.Spades;
            default: return CardType.Hearts;
        }
    }

    static applyEffect(condition: EffectCondition, effect: EffectData, context: HandContext, cardData: SpecialCardData): boolean {
        switch (effect.effectType) {
            case EffectType.AddMultiplier:
                let addMul = cardData.baseValue || 0;

                if (condition.type === ConditionType.UnUsedSuitCount) {
                    const suitType = this.getCardTypeFromString(condition.value);
                    addMul = context.countUnUsedCardsOfSuit(suitType) * (cardData.baseValue || 0);
                } else if (condition.type === ConditionType.RemainingSevens) {
                    addMul = context.remainingSevens * (cardData.baseValue || 0);
                } else if (condition.type === ConditionType.RemainingDeck) {
                    addMul = context.remainingDeck * (cardData.baseValue || 0);
                } else if (condition.type === ConditionType.UsedAceCount) {
                    addMul = context.countAcesInUsedCards() * (cardData.baseValue || 0);
                }

                context.multiplier += addMul;
                return true;

            case EffectType.MulMultiplier:
                context.multiplier *= cardData.baseValue || 1;
                return true;

            case EffectType.AddChips:
                let addChips = cardData.baseValue || 0;

                if (condition.type === ConditionType.UsedAceCount) {
                    addChips = context.countAcesInUsedCards() * (cardData.baseValue || 0);
                } else if (condition.type === ConditionType.RemainingDiscards) {
                    addChips = context.remainingDiscards * (cardData.baseValue || 0);
                } else if (condition.type === ConditionType.RemainingDeck) {
                    addChips = context.remainingDeck * (cardData.baseValue || 0);
                }

                context.chips += Math.floor(addChips);
                return true;

            case EffectType.MulChips:
                context.chips *= cardData.baseValue || 1;
                return true;

            case EffectType.AddMultiplierByRandomValue:
                context.multiplier += context.randomValue || 0;
                return true;

            case EffectType.GrowBaseValue:
                cardData.baseValue = (cardData.baseValue || 0) + (cardData.increase || 0);
                if (cardData.baseValue > (cardData.maxValue || 999)) {
                    cardData.baseValue = cardData.maxValue || 999;
                }
                return true;

            case EffectType.DecrementBaseValue:
                cardData.baseValue = (cardData.baseValue || 0) - (cardData.decrease || 0);
                if (cardData.baseValue < (cardData.maxValue || 0)) {
                    cardData.baseValue = cardData.maxValue || 0;
                }
                return true;

            default:
                return false;
        }
    }
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
        // 조커 카드 등록 (1~47번) - 클라이언트와 동일한 새로운 방식
        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_1',
            name: '조커 A',
            description: '다이아몬드로 득점 시마다 배수가 +2 된다.',
            price: 2,
            sprite: 0,
            baseValue: 2,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.CardSuit],
            conditionValues: ['Diamonds'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_2',
            name: '조커 B',
            description: '내 플레이 카드에 페어가 포함되어있으면 배수 <color=red>+[baseValue]</color> 한다.',
            price: 3,
            sprite: 1,
            baseValue: 2,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.HasPair],
            conditionValues: [''],
            conditionOperators: [OperatorType.None],
            conditionNumericValues: [0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay, JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulMultiplier, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.HandType, ConditionType.HandType],
            conditionValues: ['OnePair', 'OnePair'],
            conditionOperators: [OperatorType.Equals, OperatorType.Equals],
            conditionNumericValues: [0, 0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay, JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulMultiplier, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.HandType, ConditionType.HandType],
            conditionValues: ['TwoPair', 'TwoPair'],
            conditionOperators: [OperatorType.Equals, OperatorType.Equals],
            conditionNumericValues: [0, 0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay, JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulMultiplier, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.HandType, ConditionType.HandType],
            conditionValues: ['ThreeOfAKind', 'ThreeOfAKind'],
            conditionOperators: [OperatorType.Equals, OperatorType.Equals],
            conditionNumericValues: [0, 0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay, JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulMultiplier, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.HandType, ConditionType.HandType],
            conditionValues: ['FourOfAKind', 'FourOfAKind'],
            conditionOperators: [OperatorType.Equals, OperatorType.Equals],
            conditionNumericValues: [0, 0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay, JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulMultiplier, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.HandType, ConditionType.HandType],
            conditionValues: ['FullHouse', 'FullHouse'],
            conditionOperators: [OperatorType.Equals, OperatorType.Equals],
            conditionNumericValues: [0, 0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay, JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulMultiplier, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.HandType, ConditionType.HandType],
            conditionValues: ['HighCard', 'HighCard'],
            conditionOperators: [OperatorType.Equals, OperatorType.Equals],
            conditionNumericValues: [0, 0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay, JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulMultiplier, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.HandType, ConditionType.HandType],
            conditionValues: ['Straight', 'Straight'],
            conditionOperators: [OperatorType.Equals, OperatorType.Equals],
            conditionNumericValues: [0, 0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay, JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulMultiplier, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.HandType, ConditionType.HandType],
            conditionValues: ['Flush', 'Flush'],
            conditionOperators: [OperatorType.Equals, OperatorType.Equals],
            conditionNumericValues: [0, 0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_11',
            name: '조커 K',
            description: '핸드플레이 시, 내 핸드에 페어가 남아있으면 배수 <color=red>[baseValue]배</color>한다.',
            price: 4,
            sprite: 10,
            baseValue: 3,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.HasPairInUnUsed],
            conditionValues: [''],
            conditionOperators: [OperatorType.None],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_12',
            name: '조커 L',
            description: '핸드플레이 시, 내 핸드에 트리플이 남아있으면 배수 <color=red>[baseValue]배</color>한다.',
            price: 4,
            sprite: 11,
            baseValue: 6,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.HasTripleInUnUsed],
            conditionValues: [''],
            conditionOperators: [OperatorType.None],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_13',
            name: '조커 M',
            description: '핸드플레이 시, 내 핸드에 포 카드가 남아있으면 배수 <color=red>[baseValue]배</color>한다.',
            price: 4,
            sprite: 12,
            baseValue: 25,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.UnUsedHandType],
            conditionValues: ['FourOfAKind'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_14',
            name: '조커 N',
            description: '내 패에 스트레이트가 포함되어있으면 배수 +4 한다.',
            price: 4,
            sprite: 13,
            baseValue: 4,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.HandType],
            conditionValues: ['Straight'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_15',
            name: '조커 O',
            description: '무조건 배수 +1 한다.',
            price: 4,
            sprite: 14,
            baseValue: 1,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.Always],
            conditionValues: [''],
            conditionOperators: [OperatorType.None],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_16',
            name: '조커 P',
            description: '내 패에 트리플이 포함되어있으면 배수 <color=red>+[baseValue]</color> 한다.',
            price: 4,
            sprite: 15,
            baseValue: 3,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.HasTriple],
            conditionValues: [''],
            conditionOperators: [OperatorType.None],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_17',
            name: '조커 Q',
            description: '내 패에 포카드가 포함되어있으면 배수 +5 한다.',
            price: 4,
            sprite: 16,
            baseValue: 5,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.HandType],
            conditionValues: ['FourOfAKind'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_18',
            name: '조커 R',
            description: '내 패에 풀하우스가 포함되어있으면 배수 +4 한다.',
            price: 4,
            sprite: 17,
            baseValue: 4,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.HandType],
            conditionValues: ['FullHouse'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_19',
            name: '조커 S',
            description: '내 패에 플러시가 포함되어있으면 배수 +4 한다.',
            price: 4,
            sprite: 18,
            baseValue: 4,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.HandType],
            conditionValues: ['Flush'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_20',
            name: '조커 T',
            description: '하트로 득점 시마다, 해당 카드의 득점 시 칩스가 +10 성장한다.',
            price: 2,
            sprite: 19,
            baseValue: 10,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.AddChips],
            effectOnCards: [false],
            conditionTypes: [ConditionType.CardSuit],
            conditionValues: ['Hearts'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_21',
            name: '조커 U',
            description: '스페이드로 득점 시마다, 해당 카드의 득점 시 칩스가 +10 성장한다.',
            price: 2,
            sprite: 20,
            baseValue: 10,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.AddChips],
            effectOnCards: [false],
            conditionTypes: [ConditionType.CardSuit],
            conditionValues: ['Spades'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_22',
            name: '조커 V',
            description: '클럽으로 득점 시마다, 해당 카드의 득점 시 칩스가 +10 성장한다.',
            price: 2,
            sprite: 21,
            baseValue: 10,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.AddChips],
            effectOnCards: [false],
            conditionTypes: [ConditionType.CardSuit],
            conditionValues: ['Clubs'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_23',
            name: '조커 W',
            description: '핸드플레이 시, 내 핸드에 하트가 남아있는 카드 한 장당 배수가 +2 된다.',
            price: 2,
            sprite: 22,
            baseValue: 2,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.UnUsedSuitCount],
            conditionValues: ['Hearts'],
            conditionOperators: [OperatorType.GreaterOrEqual],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_24',
            name: '조커 X',
            description: '핸드플레이 시, 내 핸드에 스페이드가 남아있는 카드 한 장당 배수가 +2 된다.',
            price: 2,
            sprite: 23,
            baseValue: 2,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.UnUsedSuitCount],
            conditionValues: ['Spades'],
            conditionOperators: [OperatorType.GreaterOrEqual],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_25',
            name: '조커 Y',
            description: '핸드플레이 시, 내 핸드에 클럽이 남아있는 카드 한 장당 배수가 +2 된다.',
            price: 2,
            sprite: 24,
            baseValue: 2,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.UnUsedSuitCount],
            conditionValues: ['Clubs'],
            conditionOperators: [OperatorType.GreaterOrEqual],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_26',
            name: '조커 Z',
            description: '핸드플레이 시, 내 핸드에 다이아몬드가 남아있는 카드 한 장당 배수가 +2 된다.',
            price: 2,
            sprite: 25,
            baseValue: 2,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.UnUsedSuitCount],
            conditionValues: ['Diamonds'],
            conditionOperators: [OperatorType.GreaterOrEqual],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_27',
            name: '조커 AA',
            description: '득점에 사용된 에이스 한 장당, 칩스 +20 배수 +4 된다.',
            price: 4,
            sprite: 26,
            baseValue: 0,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring, JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.AddChips, EffectType.AddMultiplier],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.UsedAceCount, ConditionType.UsedAceCount],
            conditionValues: ['', ''],
            conditionOperators: [OperatorType.GreaterOrEqual, OperatorType.GreaterOrEqual],
            conditionNumericValues: [0, 0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay, JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.AddMultiplier, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.Always, ConditionType.Always],
            conditionValues: ['', ''],
            conditionOperators: [OperatorType.None, OperatorType.None],
            conditionNumericValues: [0, 0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.AddChips],
            effectOnCards: [false],
            conditionTypes: [ConditionType.Always],
            conditionValues: [''],
            conditionOperators: [OperatorType.None],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_30',
            name: '조커 AD',
            description: '전체 덱에 보유한 7 한장 당 배수가 +2 된다.',
            price: 4,
            sprite: 29,
            baseValue: 2,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.RemainingSevens],
            conditionValues: [''],
            conditionOperators: [OperatorType.GreaterOrEqual],
            conditionNumericValues: [1]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_31',
            name: '조커 AE',
            description: '전체 덱카드가 52장 보다 적으면, 그 차이 당 배수가 +4 된다.',
            price: 4,
            sprite: 30,
            baseValue: 4,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.RemainingDeck],
            conditionValues: [''],
            conditionOperators: [OperatorType.LessOrEqual],
            conditionNumericValues: [52]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring, JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.GrowBaseValue, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.CardSuit, ConditionType.Always],
            conditionValues: ['Spades', ''],
            conditionOperators: [OperatorType.Equals, OperatorType.None],
            conditionNumericValues: [0, 0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring, JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.GrowBaseValue, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.CardSuit, ConditionType.Always],
            conditionValues: ['Diamonds', ''],
            conditionOperators: [OperatorType.Equals, OperatorType.None],
            conditionNumericValues: [0, 0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring, JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.GrowBaseValue, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.CardSuit, ConditionType.Always],
            conditionValues: ['Hearts', ''],
            conditionOperators: [OperatorType.Equals, OperatorType.None],
            conditionNumericValues: [0, 0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring, JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.GrowBaseValue, EffectType.GrowBaseValue],
            effectOnCards: [false, false],
            conditionTypes: [ConditionType.CardSuit, ConditionType.Always],
            conditionValues: ['Clubs', ''],
            conditionOperators: [OperatorType.Equals, OperatorType.None],
            conditionNumericValues: [0, 0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_36',
            name: '조커 AJ',
            description: '스페이드 1장으로 플레이 시, 칩스 x20 된다.',
            price: 4,
            sprite: 35,
            baseValue: 20,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulChips],
            effectOnCards: [false],
            conditionTypes: [ConditionType.UsedSuitCount],
            conditionValues: ['Spades'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [1]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_37',
            name: '조커 AK',
            description: '다이아몬드 4장으로 득점 시, 배수 x12 된다.',
            price: 4,
            sprite: 36,
            baseValue: 12,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.UsedSuitCount],
            conditionValues: ['Diamonds'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [4]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_38',
            name: '조커 AL',
            description: '하트 2장으로 득점 시, 배수 x18 된다.',
            price: 4,
            sprite: 37,
            baseValue: 18,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.UsedSuitCount],
            conditionValues: ['Hearts'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [2]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_39',
            name: '조커 AM',
            description: '클럽 3장으로 득점 시, 칩스 x15 된다.',
            price: 4,
            sprite: 38,
            baseValue: 15,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.MulChips],
            effectOnCards: [false],
            conditionTypes: [ConditionType.UsedSuitCount],
            conditionValues: ['Clubs'],
            conditionOperators: [OperatorType.Equals],
            conditionNumericValues: [3]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_40',
            name: '조커 AN',
            description: '왼쪽 조커와 동일한 기능을 한다. (레벨은 자신의 레벨로 적용된다.).....작업 중...',
            price: 4,
            sprite: 39,
            baseValue: 0,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.Always],
            conditionValues: [''],
            conditionOperators: [OperatorType.None],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_41',
            name: '조커 AO',
            description: '남은 버리기 1 당 칩스가 +20 된다.',
            price: 5,
            sprite: 40,
            baseValue: 20,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.AddChips],
            effectOnCards: [false],
            conditionTypes: [ConditionType.RemainingDiscards],
            conditionValues: [''],
            conditionOperators: [OperatorType.GreaterOrEqual],
            conditionNumericValues: [1]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_42',
            name: '조커 AP',
            description: '제거 예정.......남은 핸드플레이 1 당 배수가 +2, 칩스는 -30 된다.',
            price: 5,
            sprite: 41,
            baseValue: 0,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [],
            effectTypes: [],
            effectOnCards: [],
            conditionTypes: [],
            conditionValues: [],
            conditionOperators: [],
            conditionNumericValues: []
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_43',
            name: '조커 AQ',
            description: '버리기가 0번 남았을 때 배수가 +15 된다.',
            price: 5,
            sprite: 42,
            baseValue: 15,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnAfterScoring],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.RemainingDiscards],
            conditionValues: [''],
            conditionOperators: [OperatorType.LessOrEqual],
            conditionNumericValues: [0]
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
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay],
            effectTypes: [EffectType.AddMultiplierByRandomValue],
            effectOnCards: [false],
            conditionTypes: [ConditionType.Always],
            conditionValues: [''],
            conditionOperators: [OperatorType.None],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_45',
            name: '조커 AS',
            description: '짝수 카드 점수 시 마다, 배수 +2 된다.',
            price: 5,
            sprite: 44,
            baseValue: 2,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.IsEvenCard],
            conditionValues: [''],
            conditionOperators: [OperatorType.None],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_46',
            name: '조커 AU',
            description: '홀수 카드 점수 시 마다, 배수 +2 된다.',
            price: 5,
            sprite: 45,
            baseValue: 2,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnScoring],
            effectTypes: [EffectType.AddMultiplier],
            effectOnCards: [false],
            conditionTypes: [ConditionType.IsOddCard],
            conditionValues: [''],
            conditionOperators: [OperatorType.None],
            conditionNumericValues: [0]
        });

        this.registerSpecialCard({
            type: SpecialCardType.Joker,
            id: 'joker_47',
            name: '조커 AV',
            description: '덱에 남아 있는 카드 1장 당 칩스가 +2 된다.',
            price: 5,
            sprite: 46,
            baseValue: 2,
            // 새로운 다중 효과/조건 시스템 (클라이언트와 동일)
            effectTimings: [JokerEffectTiming.OnHandPlay],
            effectTypes: [EffectType.AddChips],
            effectOnCards: [false],
            conditionTypes: [ConditionType.RemainingDeck],
            conditionValues: [''],
            conditionOperators: [OperatorType.GreaterOrEqual],
            conditionNumericValues: [1]
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

    // ID로 특수 카드 정보 가져오기 (참조)
    getCardById(id: string): SpecialCardData | null {
        const card = this.allSpecialCards.get(id);
        return card ?? null;
    }

    createCardById(id: string): SpecialCardData | null {
        const card = this.allSpecialCards.get(id);
        if (!card) return null;

        // 새로운 인스턴스 반환 (참조 문제 방지)
        return {
            ...card,
            // 새로운 다중 효과/조건 필드들도 복사 (클라이언트와 동일)
            effectTimings: card.effectTimings ? [...card.effectTimings] : undefined,
            effectTypes: card.effectTypes ? [...card.effectTypes] : undefined,
            effectOnCards: card.effectOnCards ? [...card.effectOnCards] : undefined,
            conditionTypes: card.conditionTypes ? [...card.conditionTypes] : undefined,
            conditionValues: card.conditionValues ? [...card.conditionValues] : undefined,
            conditionOperators: card.conditionOperators ? [...card.conditionOperators] : undefined,
            conditionNumericValues: card.conditionNumericValues ? [...card.conditionNumericValues] : undefined
        };
    }

    // 조커 효과 적용
    applyJokerEffects(timing: JokerEffectTiming, context: HandContext, ownedJokers: SpecialCardData[]): boolean {
        let isApplied = false;

        for (const jokerData of ownedJokers) {
            if (!jokerData) continue;

            // 새로운 다중 효과/조건 시스템 사용
            if (jokerData.effectTimings && jokerData.effectTypes && jokerData.conditionTypes) {
                for (let i = 0; i < jokerData.effectTimings.length; i++) {
                    if (jokerData.effectTimings[i] === timing) {
                        // 조건 평가
                        const condition: EffectCondition = {
                            type: jokerData.conditionTypes[i],
                            value: jokerData.conditionValues?.[i] || '',
                            operatorType: jokerData.conditionOperators?.[i] || OperatorType.None,
                            numericValue: jokerData.conditionNumericValues?.[i] || 0
                        };

                        if (ConditionEvaluator.evaluateCondition(condition, context, jokerData)) {
                            // 효과 적용
                            const effect: EffectData = {
                                effectType: jokerData.effectTypes[i],
                                effectOnCard: jokerData.effectOnCards?.[i] || false,
                                conditionValue: jokerData.conditionValues?.[i] || ''
                            };

                            const wasApplied = EffectApplier.applyEffect(condition, effect, context, jokerData);
                            if (wasApplied) {
                                isApplied = true;
                            }
                        }
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
        ownedJokerData: SpecialCardData[],
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
        // const ownedJokerData = ownedJokers.map(id => this.getCardById(id)).filter(Boolean) as SpecialCardData[];
        this.applyJokerEffects(JokerEffectTiming.OnHandPlay, context, ownedJokerData);

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

            this.applyJokerEffects(JokerEffectTiming.OnScoring, context, ownedJokerData);
        }

        // OnAfterScoring 효과 적용
        this.applyJokerEffects(JokerEffectTiming.OnAfterScoring, context, ownedJokerData);

        return {
            finalChips: context.chips,
            finalMultiplier: context.multiplier,
            context: context
        };
    }

    // 특수 카드 목록 가져오기
    getAllSpecialCards(): { jokerCards: SpecialCardData[], planetCards: SpecialCardData[], tarotCards: SpecialCardData[] } {
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
    getRandomShopCards(count: number, usedJokerCardIds: Set<string> = new Set()): SpecialCardData[] {

        // 🧪 테스트용: joker_24만 뽑히도록 임시 수정
        // TODO: 테스트 완료 후 아래 주석 처리된 원본 코드로 복구
        // const jokerTest = this.getCardById('joker_10');
        // if (jokerTest) {
        //     return [jokerTest, jokerTest, jokerTest, jokerTest, jokerTest]; // 5개 모두 joker_24로 채움
        // }
        // return [];


        // 원본 코드 (테스트 후 복구용)
        const result: SpecialCardData[] = [];

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
    private getRandomCardsFromPool(cardPool: SpecialCardData[], count: number): SpecialCardData[] {
        const result: SpecialCardData[] = [];
        const tempPool = [...cardPool];

        for (let i = 0; i < Math.min(count, tempPool.length); i++) {
            const idx = Math.floor(Math.random() * tempPool.length);
            result.push(tempPool[idx]);
            tempPool.splice(idx, 1);
        }

        return result;
    }

    getRandomPlanetCards(count: number): SpecialCardData[] {
        const activeCards = this.getActiveSpecialCards()
            .filter(card => card.type === SpecialCardType.Planet);
        const result: SpecialCardData[] = [];
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

                    // 2개 고정 조건-효과 시스템 필드들을 기존 리스트 구조로 변환

                    // 새로운 2개 고정 조건-효과 시스템 필드들을 기존 리스트 구조로 변환
                    const newEffectTimings: JokerEffectTiming[] = [];
                    const newEffectTypes: EffectType[] = [];
                    const newEffectOnCards: boolean[] = [];
                    const newConditionTypes: ConditionType[] = [];
                    const newConditionValues: string[] = [];
                    const newConditionOperators: OperatorType[] = [];
                    const newConditionNumericValues: number[] = [];

                    // 첫 번째 쌍 처리 (문자열 -> enum 안전 변환)
                    if (dbCard.conditionType1 && dbCard.effectType1) {
                        const ct = parseConditionType(dbCard.conditionType1);
                        const et = parseEffectType(dbCard.effectType1);
                        const ot = parseOperatorType(dbCard.conditionOperator1);
                        const tt = parseJokerEffectTiming(dbCard.effectTiming1);
                        if (ct !== undefined && et !== undefined && tt !== undefined) {
                            newConditionTypes.push(ct);
                            newConditionValues.push(dbCard.conditionValue1 || '');
                            newConditionOperators.push(ot);
                            newConditionNumericValues.push(dbCard.conditionNumeric1 || 0);
                            newEffectTimings.push(tt);
                            newEffectTypes.push(et);
                            newEffectOnCards.push(dbCard.effectTarget1 === 'Card');
                        }
                    }

                    // 두 번째 쌍 처리 (문자열 -> enum 안전 변환)
                    if (dbCard.conditionType2 && dbCard.effectType2) {
                        const ct2 = parseConditionType(dbCard.conditionType2);
                        const et2 = parseEffectType(dbCard.effectType2);
                        const ot2 = parseOperatorType(dbCard.conditionOperator2);
                        const tt2 = parseJokerEffectTiming(dbCard.effectTiming2);
                        if (ct2 !== undefined && et2 !== undefined && tt2 !== undefined) {
                            newConditionTypes.push(ct2);
                            newConditionValues.push(dbCard.conditionValue2 || '');
                            newConditionOperators.push(ot2);
                            newConditionNumericValues.push(dbCard.conditionNumeric2 || 0);
                            newEffectTimings.push(tt2);
                            newEffectTypes.push(et2);
                            newEffectOnCards.push(dbCard.effectTarget2 === 'Card');
                        }
                    }

                    // 기존 데이터가 있으면 병합, 없으면 새로 설정
                    if (newConditionTypes.length > 0) {
                        existingCard.conditionTypes = newConditionTypes;
                        existingCard.conditionValues = newConditionValues;
                        existingCard.conditionOperators = newConditionOperators;
                        existingCard.conditionNumericValues = newConditionNumericValues;
                        existingCard.effectTimings = newEffectTimings;
                        existingCard.effectTypes = newEffectTypes;
                        existingCard.effectOnCards = newEffectOnCards;
                    }

                    updatedCount++;

                    // 앞 5개 카드만 로그로 출력 (모든 데이터 포함)
                    if (updatedCount <= 25) {
                        console.log(`[SpecialCardManagerService] 로드된 카드 ${updatedCount}:`, {
                            id: dbCard.id,
                            name: dbCard.name,
                            description: dbCard.description,
                            price: dbCard.price,
                            sprite: dbCard.sprite,
                            type: dbCard.type,
                            basevalue: dbCard.basevalue,
                            increase: dbCard.increase,
                            decrease: dbCard.decrease,
                            maxvalue: dbCard.maxvalue,
                            need_card_count: dbCard.need_card_count,
                            enhanceChips: dbCard.enhanceChips,
                            enhanceMul: dbCard.enhanceMul,
                            isActive: dbCard.isActive,
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
                            // 변환된 리스트 데이터
                            convertedConditionTypes: newConditionTypes,
                            convertedConditionValues: newConditionValues,
                            convertedConditionOperators: newConditionOperators,
                            convertedConditionNumericValues: newConditionNumericValues,
                            convertedEffectTimings: newEffectTimings,
                            convertedEffectTypes: newEffectTypes,
                            convertedEffectOnCards: newEffectOnCards
                        });
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
                        // 새로운 다중 효과/조건 시스템 필드들 (JSON 문자열로 저장)
                        effectTimings: card.effectTimings ? JSON.stringify(card.effectTimings) : null,
                        effectTypes: card.effectTypes ? JSON.stringify(card.effectTypes) : null,
                        effectOnCards: card.effectOnCards ? JSON.stringify(card.effectOnCards) : null,
                        conditionTypes: card.conditionTypes ? JSON.stringify(card.conditionTypes) : null,
                        conditionValues: card.conditionValues ? JSON.stringify(card.conditionValues) : null,
                        conditionOperators: card.conditionOperators ? JSON.stringify(card.conditionOperators) : null,
                        conditionNumericValues: card.conditionNumericValues ? JSON.stringify(card.conditionNumericValues) : null,
                    }
                });
            }

            console.log(`[SpecialCardManagerService] ${allCards.length}개의 초기 카드 데이터를 DB에 삽입했습니다.`);
        } catch (error) {
            console.error('[SpecialCardManagerService] 초기 카드 데이터 삽입 실패:', error);
        }
    }
} 