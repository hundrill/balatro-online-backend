import { Injectable } from '@nestjs/common';
import { HandContext, CardType, PokerHand, PokerHandResult } from './poker-types';
import { PaytableService } from './paytable.service';
import { HandEvaluatorService } from './hand-evaluator.service';
import { CardData } from './deck.util';

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
    MulMultiplier,

    AddChips,
    MulChips,

    GrowBaseValue,
    DecrementBaseValue,

    GrowCardChips,
    GrowCardMultiplier,

    CopyLeftJoker,
}

// 연산자 타입 정의
export enum OperatorType {
    None,
    Equals,
    Greater,
    Less,
    GreaterOrEqual,
    LessOrEqual
}

export enum ConditionType {
    CardSuit,           // 카드 무늬
    CardRank,           // 카드 숫자
    HandType,           // 핸드 종류
    UsedSuitCount,      // 사용된 특정 무늬 카드 개수
    UsedCardCount,       // 사용된 카드 개수

    UnUsedHandType,     // 미사용 카드 핸드 종류
    UnUsedSuitCount,    // 미사용 카드 특정 무늬 개수

    RemainingCardCount, // 남은 덱에 카드 숫자 개수
    RemainingDeck,      // 남은 덱 카드 개수
    TotalDeck,          // 전체 덱 카드 개수
    RemainingDiscards,  // 남은 버리기 횟수
    Always              // 항상 참
}


function parseConditionType(value: string | null | undefined): ConditionType | undefined {
    switch (value) {
        case 'CardSuit': return ConditionType.CardSuit;
        case 'CardRank': return ConditionType.CardRank;
        case 'HandType': return ConditionType.HandType;
        case 'UnUsedHandType': return ConditionType.UnUsedHandType;
        case 'UnUsedSuitCount': return ConditionType.UnUsedSuitCount;
        case 'UsedCardCount': return ConditionType.UsedCardCount;
        case 'RemainingCardCount': return ConditionType.RemainingCardCount;
        case 'RemainingDeck': return ConditionType.RemainingDeck;
        case 'TotalDeck': return ConditionType.TotalDeck;
        case 'UsedSuitCount': return ConditionType.UsedSuitCount;
        case 'RemainingDiscards': return ConditionType.RemainingDiscards;
        case 'Always': return ConditionType.Always;
        default: return undefined;
    }
}

function parseEffectType(value: string | null | undefined): EffectType | undefined {
    switch (value) {
        case 'AddMultiplier': return EffectType.AddMultiplier;
        case 'MulMultiplier': return EffectType.MulMultiplier;
        case 'AddChips': return EffectType.AddChips;
        case 'MulChips': return EffectType.MulChips;
        case 'GrowBaseValue': return EffectType.GrowBaseValue;
        case 'DecrementBaseValue': return EffectType.DecrementBaseValue;
        case 'GrowCardChips': return EffectType.GrowCardChips;
        case 'GrowCardMultiplier': return EffectType.GrowCardMultiplier;
        case 'CopyLeftJoker': return EffectType.CopyLeftJoker;
        default: return undefined;
    }
}

function parseOperatorType(value: string | null | undefined): OperatorType {
    switch (value) {
        case 'Equals': return OperatorType.Equals;
        case 'Greater': return OperatorType.Greater;
        case 'GreaterOrEqual': return OperatorType.GreaterOrEqual;
        case 'Less': return OperatorType.Less;
        case 'LessOrEqual': return OperatorType.LessOrEqual;
        default: return OperatorType.None;
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


export interface EffectCondition {
    type: ConditionType;
    value: string[];
    operatorType: OperatorType;
    numericValue: number;
}

export interface EffectData {
    id: number;
    effectType: EffectType;
    effectOnCard: boolean;
    effectValue: string[];
    effectUseRandomValue: boolean;
    effectByCount: boolean;
}


export interface SpecialCardData {
    id: string;
    type: SpecialCardType;
    name: string;
    descriptionKo: string;
    descriptionEn: string;
    descriptionId: string;
    descriptionTh: string;
    price: number;
    roundProb1: number;
    roundProb2: number;
    roundProb3: number;
    roundProb4: number;
    roundProb5: number;
    sprite: number;
    baseValue: number;
    increase: number;
    decrease: number;
    maxValue: number;
    enhanceChips: number;
    enhanceMul: number;
    needCardCount: number;
    isActive: boolean;
    pokerHand: PokerHand;

    effectTimings: JokerEffectTiming[];     // 여러 타이밍을 저장
    effectTypes: EffectType[];
    effectTypesOrigin: EffectType[];
    effectValues: string[][];                 // 각 효과의 값들
    effectOnCards: boolean[];               // 각 효과의 대상들
    effectUseRandomValue: boolean[];        // 각 효과의 랜덤 값 사용 여부
    effectByCounts: boolean[];              // 각 효과의 카운트 적용 여부
    conditionTypes: ConditionType[];        // 여러 조건 타입을 저장
    conditionValues: string[][];              // 각 조건의 값들
    conditionOperators: OperatorType[];     // 각 조건의 연산자들 (enum으로 타입 안전성 강화)
    conditionNumericValues: number[];       // 각 조건의 수치값들
}

/**
 * 조건-효과 쌍만 딥카피하는 함수 (클라이언트와 동일한 방식)
 * @param target 대상 SpecialCardData (현재 인스턴스)
 * @param from 원본 SpecialCardData
 */
export function deepCopyConditionEffectPairs(target: SpecialCardData, from: SpecialCardData): void {
    target.conditionTypes = from.conditionTypes ? [...from.conditionTypes] : [];
    target.conditionValues = from.conditionValues ? from.conditionValues.map(list => [...list]) : [['']];
    target.conditionOperators = from.conditionOperators ? [...from.conditionOperators] : [];
    target.conditionNumericValues = from.conditionNumericValues ? [...from.conditionNumericValues] : [];
    target.effectTimings = from.effectTimings ? [...from.effectTimings] : [];
    target.effectTypes = from.effectTypes ? [...from.effectTypes] : [];
    target.effectOnCards = from.effectOnCards ? [...from.effectOnCards] : [];
    target.effectValues = from.effectValues ? from.effectValues.map(list => [...list]) : [['']];
    target.effectUseRandomValue = from.effectUseRandomValue ? [...from.effectUseRandomValue] : [];
    target.effectByCounts = from.effectByCounts ? [...from.effectByCounts] : [];
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


    static evaluateCondition(condition: EffectCondition, context: HandContext, cardData: SpecialCardData): boolean {

        console.log('condition.value type:', typeof condition.value);
        console.log('condition.value:', condition.value);
        console.log('isArray:', Array.isArray(condition.value));

        console.log(`[ConditionEvaluator] evaluateCondition condition.type: ${condition.type}`);
        console.log(`[ConditionEvaluator] evaluateCondition condition.value: ${condition.value}`);
        console.log(`[ConditionEvaluator] evaluateCondition condition.operatorType: ${condition.operatorType}`);
        console.log(`[ConditionEvaluator] evaluateCondition condition.numericValue: ${condition.numericValue}`);


        switch (condition.type) {
            case ConditionType.CardSuit:
                return condition.value?.some(val => val && val !== '' && context.currentCardData?.suit.toString() === val);

            case ConditionType.CardRank:
                return condition.value?.some(val => val && val !== '' && context.currentCardData?.rank.toString() === val);

            case ConditionType.HandType:
                return condition.value?.some(val => val && val !== '' && context.pokerHand.toString() === val);

            case ConditionType.UsedSuitCount:
                return condition.value?.some(val => val && val !== '' &&
                    this.compareNumeric(context.countSuitInUsedCards(this.getCardTypeFromString(val)), condition.operatorType, condition.numericValue));

            case ConditionType.UsedCardCount:
                return condition.value?.some(val => val && val !== '' &&
                    this.compareNumeric(context.countNumberInUsedCards(parseInt(condition.value[0]) || 0), condition.operatorType, condition.numericValue));

            case ConditionType.UnUsedHandType:
                return condition.value?.some(val => val && val !== '' && context.unUsedPokerHand.toString() === val);

            case ConditionType.UnUsedSuitCount:
                return condition.value?.some(val => val && val !== '' &&
                    this.compareNumeric(context.countSuitInUnUsedCards(this.getCardTypeFromString(val)), condition.operatorType, condition.numericValue));

            case ConditionType.RemainingCardCount:
                return condition.value?.some(val => val && val !== '' && this.compareNumeric(context.countNumberInRemainingDeck(parseInt(val) || 0), condition.operatorType, condition.numericValue));
            // return this.compareNumeric(context.countNumberInRemainingDeck(parseInt(condition.value[0]) || 0), condition.operatorType, condition.numericValue);

            case ConditionType.RemainingDeck:
                return this.compareNumeric(context.remainingDeck.length, condition.operatorType, condition.numericValue);

            case ConditionType.TotalDeck:
                return this.compareNumeric(context.totalDeck, condition.operatorType, condition.numericValue);

            case ConditionType.RemainingDiscards:
                return this.compareNumeric(context.remainingDiscards, condition.operatorType, condition.numericValue);

            case ConditionType.Always:
                return true;

            default:
                return false;
        }
    }

    private static compareNumeric(actual: number, operatorType: OperatorType, expected: number): boolean {
        switch (operatorType) {
            case OperatorType.Equals: return actual === expected;
            case OperatorType.Greater: return actual > expected;
            case OperatorType.GreaterOrEqual: return actual >= expected;
            case OperatorType.Less: return actual < expected;
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

    static applyEffect(condition: EffectCondition, effect: EffectData, context: HandContext, cardData: SpecialCardData, paytableService?: PaytableService): boolean {
        let totalCount = 0;

        if (effect.effectByCount) {
            if (condition.type === ConditionType.UnUsedSuitCount) {
                for (const val of condition.value) {
                    if (val && val !== '') {
                        totalCount += context.countSuitInUnUsedCards(this.getCardTypeFromString(val));
                    }
                }
            } else if (condition.type === ConditionType.UsedCardCount) {
                for (const val of condition.value) {
                    if (val && val !== '') {
                        totalCount += context.countNumberInUsedCards(parseInt(val) || 0);
                    }
                }
            } else if (condition.type === ConditionType.UsedSuitCount) {
                for (const val of condition.value) {
                    if (val && val !== '') {
                        totalCount += context.countSuitInUsedCards(this.getCardTypeFromString(val));
                    }
                }
            } else if (condition.type === ConditionType.RemainingDeck) {
                totalCount = context.remainingDeck.length;
            } else if (condition.type === ConditionType.TotalDeck) {
                totalCount = condition.numericValue - context.totalDeck;
            } else if (condition.type === ConditionType.RemainingDiscards) {
                totalCount = context.remainingDiscards;
            } else if (condition.type === ConditionType.RemainingCardCount) {
                for (const val of condition.value) {
                    if (val && val !== '') {
                        totalCount += context.countNumberInRemainingDeck(parseInt(val) || 0);
                    }
                }
            }
        }

        let value = parseFloat(effect.effectValue[0]) || 0;

        if (effect.effectValue[0] === "[basevalue]") {
            value = cardData.baseValue;
        } else if (effect.effectValue[0] === "[increase]") {
            value = cardData.increase;
        } else if (effect.effectValue[0] === "[decrease]") {
            value = -cardData.decrease;
        } else if (effect.effectValue[0].includes("@")) {
            value = context.randomValue.find(r => r.id === cardData.id + "_" + effect.id)?.value || 0;
        }

        const applyValue = totalCount > 0 ? value * totalCount : value;

        switch (effect.effectType) {
            case EffectType.AddMultiplier:
                context.multiplier += applyValue;
                break;

            case EffectType.MulMultiplier:
                context.multiplier *= applyValue;
                break;

            case EffectType.AddChips:
                context.chips += applyValue;
                break;

            case EffectType.MulChips:
                context.chips *= applyValue;
                break;

            case EffectType.GrowCardChips:
                if (context.currentCardData && context.userId && paytableService) {
                    paytableService.enhanceCardChips(context.userId, context.currentCardData, Math.floor(applyValue));
                }
                break;

            case EffectType.GrowCardMultiplier:
                if (context.currentCardData && context.userId && paytableService) {
                    paytableService.enhanceCardMultiplier(context.userId, context.currentCardData, applyValue);
                }
                break;

            case EffectType.GrowBaseValue:
                cardData.baseValue += applyValue;
                break;

            case EffectType.DecrementBaseValue:
                cardData.baseValue += applyValue;
                if (cardData.baseValue < 1) {
                    cardData.baseValue = 1;
                }
                break;

            default:
                return false;
        }

        return true;
    }
}

@Injectable()
export class SpecialCardManagerService {
    private allSpecialCards: Map<string, SpecialCardData> = new Map();

    constructor(
        private readonly paytableService: PaytableService,
        private readonly handEvaluatorService: HandEvaluatorService
    ) {
        // this.initializeSpecialCards();
    }

    getCardById(id: string): SpecialCardData | null {
        const card = this.allSpecialCards.get(id);
        return card ?? null;
    }

    // ID로 특수 카드 정보 가져오기 (생성)
    createCardById(id: string): SpecialCardData | null {
        const card = this.allSpecialCards.get(id);
        if (!card) return null;

        // 각 요소의 타입 확인
        // if (Array.isArray(card.conditionValues)) {
        //     card.conditionValues.forEach((value, index) => {
        //         console.log(`conditionValues[${index}]:`, value);
        //         console.log(`conditionValues[${index}] type:`, typeof value);
        //         console.log(`conditionValues[${index}] isArray:`, Array.isArray(value));
        //     });
        // }

        // 새로운 인스턴스 반환 (참조 문제 방지)
        return {
            ...card,
            effectTimings: card.effectTimings ? [...card.effectTimings] : [],
            effectTypes: card.effectTypes ? [...card.effectTypes] : [],
            effectTypesOrigin: card.effectTypesOrigin ? [...card.effectTypesOrigin] : [],
            effectValues: card.effectValues ? [...card.effectValues] : [['']],
            effectUseRandomValue: card.effectUseRandomValue ? [...card.effectUseRandomValue] : [],
            effectByCounts: card.effectByCounts ? [...card.effectByCounts] : [],
            effectOnCards: card.effectOnCards ? [...card.effectOnCards] : [],
            conditionTypes: card.conditionTypes ? [...card.conditionTypes] : [],
            conditionValues: card.conditionValues ? [...card.conditionValues] : [['']],
            conditionOperators: card.conditionOperators ? [...card.conditionOperators] : [],
            conditionNumericValues: card.conditionNumericValues ? [...card.conditionNumericValues] : []
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
                            value: jokerData.conditionValues?.[i] || [''],
                            operatorType: jokerData.conditionOperators?.[i] || OperatorType.None,
                            numericValue: jokerData.conditionNumericValues?.[i] || 0
                        };

                        if (ConditionEvaluator.evaluateCondition(condition, context, jokerData)) {

                            let applySpecialCardData = jokerData;

                            const effect: EffectData = {
                                id: i,
                                effectType: applySpecialCardData.effectTypes?.[i] || EffectType.AddMultiplier,
                                effectOnCard: applySpecialCardData.effectOnCards?.[i] || false,
                                effectValue: applySpecialCardData.effectValues?.[i] || [''],
                                effectByCount: applySpecialCardData.effectByCounts?.[i] || false,
                                effectUseRandomValue: applySpecialCardData.effectUseRandomValue?.[i] || false
                            };

                            const wasApplied = EffectApplier.applyEffect(condition, effect, context, applySpecialCardData, this.paytableService);
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

    // CopyLeftJoker 효과를 위한 사전 처리 (클라이언트와 동일)
    readyForApplyJokerEffects(context: HandContext, ownedJokers: SpecialCardData[]): void {
        for (const joker of ownedJokers) {
            if (!joker.effectTypesOrigin) continue;

            for (let i = 0; i < joker.effectTypesOrigin.length; i++) {
                if (joker.effectTypesOrigin[i] === EffectType.CopyLeftJoker) {
                    const currentJokerIndex = ownedJokers.indexOf(joker);
                    if (currentJokerIndex > 0) {
                        console.log("여기서 조커 데이터 복사:", ownedJokers[currentJokerIndex - 1]);
                        deepCopyConditionEffectPairs(joker, ownedJokers[currentJokerIndex - 1]);
                    } else {
                        const myData = this.getCardById(joker.id);
                        if (myData) {
                            console.log("자기자신으로 다시 셋팅:", myData.id);
                            deepCopyConditionEffectPairs(joker, myData);
                        }
                    }
                }
            }
        }
    }

    // 행성 카드의 PokerHand 설정 (클라이언트와 동일)
    private imsiSetPlanetPokerHand(card: SpecialCardData): void {
        if (card.id === "planet_1") card.pokerHand = PokerHand.HighCard;
        else if (card.id === "planet_2") card.pokerHand = PokerHand.OnePair;
        else if (card.id === "planet_3") card.pokerHand = PokerHand.TwoPair;
        else if (card.id === "planet_4") card.pokerHand = PokerHand.ThreeOfAKind;
        else if (card.id === "planet_5") card.pokerHand = PokerHand.Straight;
        else if (card.id === "planet_6") card.pokerHand = PokerHand.Flush;
        else if (card.id === "planet_7") card.pokerHand = PokerHand.FullHouse;
        else if (card.id === "planet_8") card.pokerHand = PokerHand.FourOfAKind;
        else if (card.id === "planet_9") card.pokerHand = PokerHand.StraightFlush;
    }

    // 전체 점수 계산 시퀀스 (클라이언트의 ShowHandPlayCardsSequence와 동일)
    calculateFinalScore(
        userId: string,
        handResult: PokerHandResult,
        ownedJokers: SpecialCardData[],
        remainingDiscards: number = 0,
        remainingDeck: CardData[] = [],
        totalDeck: number = 0
    ): HandContext {
        // HandContext 생성
        const context = this.handEvaluatorService.createHandContext(
            userId,
            handResult,
            remainingDiscards,
            remainingDeck,
            totalDeck,
            ownedJokers
        );

        this.readyForApplyJokerEffects(context, ownedJokers);

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
            const cardValue = this.handEvaluatorService.calculateCardValue(userId, card);
            context.chips += cardValue;
            context.currentCardData = card;

            this.applyJokerEffects(JokerEffectTiming.OnScoring, context, ownedJokers);
        }

        // OnAfterScoring 효과 적용
        this.applyJokerEffects(JokerEffectTiming.OnAfterScoring, context, ownedJokers);

        return context;
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

    // 라운드별 확률값 가져오기
    private getRoundProbability(card: SpecialCardData, round: number): number {
        switch (round) {
            case 1: return card.roundProb1;
            case 2: return card.roundProb2;
            case 3: return card.roundProb3;
            case 4: return card.roundProb4;
            case 5: return card.roundProb5;
            default: return 0;
        }
    }

    // 현재 라운드에 사용 가능한 조커 카드 필터링
    private getAvailableJokersForRound(round: number, usedJokerCardIds: Set<string>): SpecialCardData[] {
        return this.getActiveSpecialCards()
            .filter(card =>
                card.type === SpecialCardType.Joker &&
                !usedJokerCardIds.has(card.id) &&
                this.getRoundProbability(card, round) > 0
            );
    }

    // 현재 라운드에 사용 가능한 행성 카드 필터링
    private getAvailablePlanetsForRound(round: number): SpecialCardData[] {
        const planets = this.getActiveSpecialCards()
            .filter(card => card.type === SpecialCardType.Planet);

        // roundProb가 0보다 큰 카드가 있는지 확인
        const availablePlanets = planets.filter(card => this.getRoundProbability(card, round) > 0);

        // roundProb가 모두 0이면 모든 행성 카드 반환 (랜덤 선택용)
        return availablePlanets.length > 0 ? availablePlanets : planets;
    }

    // 현재 라운드에 사용 가능한 타로 카드 필터링
    private getAvailableTarotsForRound(round: number): SpecialCardData[] {
        const tarots = this.getActiveSpecialCards()
            .filter(card => card.type === SpecialCardType.Tarot);

        // roundProb가 0보다 큰 카드가 있는지 확인
        const availableTarots = tarots.filter(card => this.getRoundProbability(card, round) > 0);

        // roundProb가 모두 0이면 모든 타로 카드 반환 (랜덤 선택용)
        return availableTarots.length > 0 ? availableTarots : tarots;
    }

    // 확률 기반 카드 선택 (정수 기반으로 부동소수점 오차 방지)
    private selectCardByProbability(availableCards: SpecialCardData[], round: number): SpecialCardData {
        if (availableCards.length === 0) {
            return this.getDummyCard();
        }

        if (availableCards.length === 1) {
            return availableCards[0];
        }

        const probabilities = availableCards.map(card => this.getRoundProbability(card, round));
        const totalProbability = probabilities.reduce((sum, prob) => sum + prob, 0);

        // 모든 확률이 0이면 균등한 확률로 랜덤 선택
        if (totalProbability === 0) {
            const randomIndex = Math.floor(Math.random() * availableCards.length);
            return availableCards[randomIndex];
        }

        // 정수 기반 랜덤 선택 (부동소수점 오차 완전 방지)
        const randomInt = Math.floor(Math.random() * totalProbability);

        let cumulativeProbability = 0;
        for (let i = 0; i < availableCards.length; i++) {
            cumulativeProbability += probabilities[i];
            if (randomInt < cumulativeProbability) {
                return availableCards[i];
            }
        }

        // 이론적으로 도달하지 않음
        return availableCards[availableCards.length - 1];
    }

    // 더미 카드 생성
    private getDummyCard(): SpecialCardData {
        return this.getCardById("joker_1")!;
        // return {
        //     id: 'dummy_card',
        //     name: 'Dummy Card',
        //     descriptionKo: 'Dummy card for fallback',
        //     descriptionEn: 'Dummy card for fallback',
        //     descriptionId: 'Dummy card for fallback',
        //     price: 0,
        //     roundProb1: 0,
        //     roundProb2: 0,
        //     roundProb3: 0,
        //     roundProb4: 0,
        //     roundProb5: 0,
        //     sprite: 0,
        //     type: SpecialCardType.Joker,
        //     baseValue: 0,
        //     increase: 0,
        //     decrease: 0,
        //     maxValue: 0,
        //     needCardCount: 0,
        //     enhanceChips: 0,
        //     enhanceMul: 0,
        //     isActive: true,
        //     conditionTypes: [],
        //     conditionValues: [['']],
        //     conditionOperators: [],
        //     conditionNumericValues: [],
        //     effectTimings: [],
        //     effectTypes: [],
        //     effectTypesOrigin: [],
        //     effectValues: [['']],
        //     effectOnCards: [],
        //     effectUseRandomValue: [],
        //     effectByCounts: [],
        //     pokerHand: PokerHand.None,
        // };
    }

    // 기존 joker-cards.util.ts 함수들을 대체하는 메서드들
    getRandomShopCards(count: number, currentRound: number, usedJokerCardIds: Set<string> = new Set(), testJokerIds: string[] = ['', '', '', '', '']): SpecialCardData[] {
        const result: SpecialCardData[] = [];

        console.log('getRandomShopCards currentRound:', currentRound);
        console.log('getRandomShopCards usedJokerCardIds:', usedJokerCardIds);
        console.log('getRandomShopCards testJokerIds:', testJokerIds);

        // 테스트 조커 ID가 설정된 슬롯들 처리
        for (let i = 0; i < count && i < testJokerIds.length; i++) {
            const testJokerId = testJokerIds[i];

            if (testJokerId && testJokerId.trim() !== '') {
                console.log('------------------------------getRandomShopCards testJokerId:', testJokerId);
                // 테스트 조커 ID가 설정된 경우 해당 카드 사용
                const testCard = this.getCardById(testJokerId);
                if (testCard) {
                    result.push(testCard);
                } else {
                    // 테스트 조커 ID가 유효하지 않은 경우 확률 기반 로직으로 대체
                    result.push(this.getRandomCardForSlotByProbability(i, currentRound, usedJokerCardIds, result));
                }
            } else {
                // 테스트 조커 ID가 없는 경우 확률 기반 로직으로 랜덤 생성
                result.push(this.getRandomCardForSlotByProbability(i, currentRound, usedJokerCardIds, result));
            }
        }

        return result;
    }

    // 슬롯별 확률 기반 카드 생성 헬퍼 메서드
    private getRandomCardForSlotByProbability(slotIndex: number, currentRound: number, usedJokerCardIds: Set<string>, newCards: SpecialCardData[]): SpecialCardData {
        // 슬롯 0, 1, 2: 조커 카드 (확률 기반)
        if (slotIndex < 3 || true) {
            const availableJokers = this.getAvailableJokersForRound(currentRound, usedJokerCardIds);

            if (availableJokers.length > 0) {
                const selectedJoker = this.selectCardByProbability(availableJokers, currentRound);
                usedJokerCardIds.add(selectedJoker.id); // 중복 방지
                return selectedJoker;
            } else {
                // 사용 가능한 조커가 없는 경우 더미 카드
                return this.getDummyCard();
            }
        }
        // 슬롯 3: 행성 카드 (확률 기반)
        else { }

    }

    // 슬롯별 랜덤 카드 생성 헬퍼 메서드 (기존 방식 - 호환성 유지)
    private getRandomCardForSlot(slotIndex: number, usedJokerCardIds: Set<string>, newCards: SpecialCardData[]): SpecialCardData {
        // 슬롯 0,1,2: 조커 카드
        if (slotIndex < 3) {
            const activeJokers = this.getActiveSpecialCards()
                .filter(card => card.type === SpecialCardType.Joker && !usedJokerCardIds.has(card.id));
            const availableJokers = activeJokers.filter(joker => !newCards.some(existing => existing.id === joker.id));

            if (availableJokers.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableJokers.length);
                return availableJokers[randomIndex];
            }
        }
        // 슬롯 3: 행성 카드
        else if (slotIndex === 3) {
            const activePlanets = this.getActiveSpecialCards()
                .filter(card => card.type === SpecialCardType.Planet);
            const availablePlanets = activePlanets.filter(planet => !newCards.some(existing => existing.id === planet.id));

            if (availablePlanets.length > 0) {
                const randomIndex = Math.floor(Math.random() * availablePlanets.length);
                return availablePlanets[randomIndex];
            }
        }
        // 슬롯 4: 타로 카드
        else if (slotIndex === 4) {
            const activeTarots = this.getActiveSpecialCards()
                .filter(card => card.type === SpecialCardType.Tarot);
            const availableTarots = activeTarots.filter(tarot => !newCards.some(existing => existing.id === tarot.id));

            if (availableTarots.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableTarots.length);
                return availableTarots[randomIndex];
            }
        }

        // 기본값으로 첫 번째 활성 카드 반환 (빈 배열인 경우를 대비해 더미 카드 생성)
        const activeCards = this.getActiveSpecialCards();
        if (activeCards.length > 0) {
            return activeCards[0];
        }

        // 빈 배열인 경우 더미 카드 반환 (실제로는 발생하지 않아야 함)
        return {
            id: 'dummy_card',
            name: 'Dummy Card',
            descriptionKo: 'Dummy card for fallback',
            descriptionEn: 'Dummy card for fallback',
            descriptionId: 'Dummy card for fallback',
            descriptionTh: 'Dummy card for fallback',
            price: 0,
            roundProb1: 0,
            roundProb2: 0,
            roundProb3: 0,
            roundProb4: 0,
            roundProb5: 0,
            sprite: 0,
            type: SpecialCardType.Joker,
            baseValue: 0,
            increase: 0,
            decrease: 0,
            maxValue: 0,
            needCardCount: 0,
            enhanceChips: 0,
            enhanceMul: 0,
            isActive: true,
            conditionTypes: [],
            conditionValues: [['']],
            conditionOperators: [],
            conditionNumericValues: [],
            effectTimings: [],
            effectTypes: [],
            effectTypesOrigin: [],
            effectOnCards: [],
            effectValues: [['']],
            effectByCounts: [],
            effectUseRandomValue: [],
            pokerHand: PokerHand.None
        };
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
                console.log('[SpecialCardManagerService] DB에 카드 데이터가 없습니다.');
                // await this.insertInitialCardsToDB(prisma);
                return;
            }

            // DB 데이터로 메모리 카드 업데이트
            let updatedCount = 0;
            for (const dbCard of dbCards) {

                let newCard: SpecialCardData = {
                    id: dbCard.id,
                    type: dbCard.type === 'Planet' ? SpecialCardType.Planet : dbCard.type === 'Tarot' ? SpecialCardType.Tarot : SpecialCardType.Joker,
                    name: dbCard.name,
                    descriptionKo: dbCard.descriptionKo,
                    descriptionEn: dbCard.descriptionEn,
                    descriptionId: dbCard.descriptionId,
                    descriptionTh: dbCard.descriptionTh,
                    price: dbCard.price,
                    roundProb1: dbCard.roundProb1 || 0,
                    roundProb2: dbCard.roundProb2 || 0,
                    roundProb3: dbCard.roundProb3 || 0,
                    roundProb4: dbCard.roundProb4 || 0,
                    roundProb5: dbCard.roundProb5 || 0,
                    sprite: dbCard.sprite,
                    baseValue: dbCard.basevalue,
                    increase: dbCard.increase,
                    decrease: dbCard.decrease,
                    maxValue: dbCard.maxvalue,
                    needCardCount: dbCard.need_card_count,
                    enhanceChips: dbCard.enhanceChips,
                    enhanceMul: dbCard.enhanceMul,
                    isActive: dbCard.isActive !== false,
                    pokerHand: PokerHand.None,
                    effectTimings: [],
                    effectTypes: [],
                    effectTypesOrigin: [],
                    effectValues: [['']],
                    effectOnCards: [],
                    effectUseRandomValue: [],
                    effectByCounts: [],
                    conditionTypes: [],
                    conditionValues: [['']],
                    conditionOperators: [],
                    conditionNumericValues: []
                };
                this.allSpecialCards.set(dbCard.id, newCard);

                newCard.name = dbCard.name;
                newCard.descriptionKo = dbCard.descriptionKo;
                newCard.descriptionEn = dbCard.descriptionEn;
                newCard.descriptionId = dbCard.descriptionId;
                newCard.descriptionTh = dbCard.descriptionTh;
                newCard.price = dbCard.price;
                newCard.roundProb1 = dbCard.roundProb1 || 0;
                newCard.roundProb2 = dbCard.roundProb2 || 0;
                newCard.roundProb3 = dbCard.roundProb3 || 0;
                newCard.roundProb4 = dbCard.roundProb4 || 0;
                newCard.roundProb5 = dbCard.roundProb5 || 0;
                newCard.sprite = dbCard.sprite;
                newCard.baseValue = dbCard.basevalue;
                newCard.increase = dbCard.increase;
                newCard.decrease = dbCard.decrease;
                newCard.maxValue = dbCard.maxvalue;
                newCard.enhanceChips = dbCard.enhanceChips;
                newCard.enhanceMul = dbCard.enhanceMul;
                newCard.needCardCount = dbCard.need_card_count;
                newCard.isActive = dbCard.isActive !== false; // 기본값 true

                this.imsiSetPlanetPokerHand(newCard);

                const newEffectTimings: JokerEffectTiming[] = [];
                const newEffectTypes: EffectType[] = [];
                const newEffectTypesOrigin: EffectType[] = [];
                const newEffectValues: string[][] = [];
                const newEffectOnCards: boolean[] = [];
                const newEffectByCounts: boolean[] = [];
                const newConditionTypes: ConditionType[] = [];
                const newConditionValues: string[][] = [];
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
                        newConditionValues.push(
                            dbCard.conditionValue1
                                ? dbCard.conditionValue1.split(',').map((s: string) => s.trim())
                                : []
                        );
                        newConditionOperators.push(ot);
                        newConditionNumericValues.push(dbCard.conditionNumeric1 || 0);
                        newEffectTimings.push(tt);
                        newEffectTypes.push(et);
                        newEffectTypesOrigin.push(et);
                        newEffectOnCards.push(dbCard.effectTarget1 === 'Card');
                        newEffectByCounts.push(dbCard.effectByCount1 || false);
                        newEffectValues.push(dbCard.effectValue1 ? dbCard.effectValue1.split(',').map((s: string) => s.trim()) : ['']);
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
                        newConditionValues.push(
                            dbCard.conditionValue2
                                ? dbCard.conditionValue2.split(',').map((s: string) => s.trim())
                                : []
                        );
                        newConditionOperators.push(ot2);
                        newConditionNumericValues.push(dbCard.conditionNumeric2 || 0);
                        newEffectTimings.push(tt2);
                        newEffectTypes.push(et2);
                        newEffectTypesOrigin.push(et2);
                        newEffectOnCards.push(dbCard.effectTarget2 === 'Card');
                        newEffectByCounts.push(dbCard.effectByCount2 || false);
                        newEffectValues.push(dbCard.effectValue2 ? dbCard.effectValue2.split(',').map((s: string) => s.trim()) : ['']);
                    }
                }

                // 세 번째 쌍 처리 (문자열 -> enum 안전 변환)
                if (dbCard.conditionType3 && dbCard.effectType3) {
                    const ct3 = parseConditionType(dbCard.conditionType3);
                    const et3 = parseEffectType(dbCard.effectType3);
                    const ot3 = parseOperatorType(dbCard.conditionOperator3);
                    const tt3 = parseJokerEffectTiming(dbCard.effectTiming3);
                    if (ct3 !== undefined && et3 !== undefined && tt3 !== undefined) {
                        newConditionTypes.push(ct3);
                        newConditionValues.push(
                            dbCard.conditionValue3
                                ? dbCard.conditionValue3.split(',').map((s: string) => s.trim())
                                : []
                        );
                        newConditionOperators.push(ot3);
                        newConditionNumericValues.push(dbCard.conditionNumeric3 || 0);
                        newEffectTimings.push(tt3);
                        newEffectTypes.push(et3);
                        newEffectTypesOrigin.push(et3);
                        newEffectOnCards.push(dbCard.effectTarget3 === 'Card');
                        newEffectByCounts.push(dbCard.effectByCount3 || false);
                        newEffectValues.push(dbCard.effectValue3 ? dbCard.effectValue3.split(',').map((s: string) => s.trim()) : ['']);
                    }
                }

                // 네 번째 쌍 처리 (문자열 -> enum 안전 변환)
                if (dbCard.conditionType4 && dbCard.effectType4) {
                    const ct4 = parseConditionType(dbCard.conditionType4);
                    const et4 = parseEffectType(dbCard.effectType4);
                    const ot4 = parseOperatorType(dbCard.conditionOperator4);
                    const tt4 = parseJokerEffectTiming(dbCard.effectTiming4);
                    if (ct4 !== undefined && et4 !== undefined && tt4 !== undefined) {
                        newConditionTypes.push(ct4);
                        newConditionValues.push(
                            dbCard.conditionValue4
                                ? dbCard.conditionValue4.split(',').map((s: string) => s.trim())
                                : []
                        );
                        newConditionOperators.push(ot4);
                        newConditionNumericValues.push(dbCard.conditionNumeric4 || 0);
                        newEffectTimings.push(tt4);
                        newEffectTypes.push(et4);
                        newEffectTypesOrigin.push(et4);
                        newEffectOnCards.push(dbCard.effectTarget4 === 'Card');
                        newEffectByCounts.push(dbCard.effectByCount4 || false);
                        newEffectValues.push(dbCard.effectValue4 ? dbCard.effectValue4.split(',').map((s: string) => s.trim()) : ['']);
                    }
                }

                // 다섯 번째 쌍 처리 (문자열 -> enum 안전 변환)
                if (dbCard.conditionType5 && dbCard.effectType5) {
                    const ct5 = parseConditionType(dbCard.conditionType5);
                    const et5 = parseEffectType(dbCard.effectType5);
                    const ot5 = parseOperatorType(dbCard.conditionOperator5);
                    const tt5 = parseJokerEffectTiming(dbCard.effectTiming5);
                    if (ct5 !== undefined && et5 !== undefined && tt5 !== undefined) {
                        newConditionTypes.push(ct5);
                        newConditionValues.push(
                            dbCard.conditionValue5
                                ? dbCard.conditionValue5.split(',').map((s: string) => s.trim())
                                : []
                        );
                        newConditionOperators.push(ot5);
                        newConditionNumericValues.push(dbCard.conditionNumeric5 || 0);
                        newEffectTimings.push(tt5);
                        newEffectTypes.push(et5);
                        newEffectTypesOrigin.push(et5);
                        newEffectOnCards.push(dbCard.effectTarget5 === 'Card');
                        newEffectByCounts.push(dbCard.effectByCount5 || false);
                        newEffectValues.push(dbCard.effectValue5 ? dbCard.effectValue5.split(',').map((s: string) => s.trim()) : ['']);
                    }
                }

                if (newConditionTypes.length > 0) {
                    newCard.conditionTypes = newConditionTypes;
                    newCard.conditionValues = newConditionValues;
                    newCard.conditionOperators = newConditionOperators;
                    newCard.conditionNumericValues = newConditionNumericValues;
                    newCard.effectTimings = newEffectTimings;
                    newCard.effectTypes = newEffectTypes;
                    newCard.effectTypesOrigin = newEffectTypesOrigin;
                    newCard.effectValues = newEffectValues;
                    newCard.effectOnCards = newEffectOnCards;
                    newCard.effectByCounts = newEffectByCounts;
                }

                updatedCount++;

                if (updatedCount <= 1) {
                    console.log(`[SpecialCardManagerService] 로드된 카드 ${updatedCount}:`, {
                        id: dbCard.id,
                        name: dbCard.name,
                        descriptionKo: dbCard.descriptionKo,
                        descriptionEn: dbCard.descriptionEn,
                        descriptionId: dbCard.descriptionId,
                        descriptionTh: dbCard.descriptionTh,
                        price: dbCard.price,
                        roundProb1: dbCard.roundProb1 || 0,
                        roundProb2: dbCard.roundProb2 || 0,
                        roundProb3: dbCard.roundProb3 || 0,
                        roundProb4: dbCard.roundProb4 || 0,
                        roundProb5: dbCard.roundProb5 || 0,
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
                        ConditionTypes: newConditionTypes,
                        ConditionValues: newConditionValues,
                        ConditionOperators: newConditionOperators,
                        ConditionNumericValues: newConditionNumericValues,
                        EffectTimings: newEffectTimings,
                        EffectTypes: newEffectTypes,
                        EffectTypesOrigin: newEffectTypesOrigin,
                        EffectValues: newEffectValues,
                        EffectOnCards: newEffectOnCards
                    });
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
    //     private async insertInitialCardsToDB(prisma: any): Promise<void> {
    //         try {
    //             const allCards = Array.from(this.allSpecialCards.values());

    //             for (const card of allCards) {
    //                 await prisma.specialCard.create({
    //                     data: {
    //                         id: card.id,
    //                         name: card.name,
    //                         price: card.price,
    //                         sprite: card.sprite,
    //                         type: card.type.toString(),
    //                         basevalue: card.baseValue,
    //                         increase: card.increase,
    //                         decrease: card.decrease,
    //                         maxvalue: card.maxValue,
    //                         need_card_count: card.needCardCount,
    //                         enhanceChips: card.enhanceChips,
    //                         enhanceMul: card.enhanceMul,
    //                         isActive: card.isActive !== false,

    //                         effectTimings: card.effectTimings ? JSON.stringify(card.effectTimings) : null,
    //                         effectTypes: card.effectTypes ? JSON.stringify(card.effectTypes) : null,
    //                         effectOnCards: card.effectOnCards ? JSON.stringify(card.effectOnCards) : null,
    //                         conditionTypes: card.conditionTypes ? JSON.stringify(card.conditionTypes) : null,
    //                         conditionValues: card.conditionValues ? JSON.stringify(card.conditionValues) : null,
    //                         conditionOperators: card.conditionOperators ? JSON.stringify(card.conditionOperators) : null,
    //                         conditionNumericValues: card.conditionNumericValues ? JSON.stringify(card.conditionNumericValues) : null,
    //                     }
    //                 });
    //             }

    //             console.log(`[SpecialCardManagerService] ${allCards.length}개의 초기 카드 데이터를 DB에 삽입했습니다.`);
    //         } catch (error) {
    //             console.error('[SpecialCardManagerService] 초기 카드 데이터 삽입 실패:', error);
    //         }
    //     }
} 