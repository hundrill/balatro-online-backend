import { Card } from "./deck.util";

// 포커 족보 enum
export enum PokerHand {
    None = 'None',
    HighCard = 'HighCard',
    OnePair = 'OnePair',
    TwoPair = 'TwoPair',
    ThreeOfAKind = 'ThreeOfAKind',
    Straight = 'Straight',
    Flush = 'Flush',
    FullHouse = 'FullHouse',
    FourOfAKind = 'FourOfAKind',
    StraightFlush = 'StraightFlush',
}

// 카드 무늬 enum
export enum CardType {
    Clubs = 'Clubs',
    Diamonds = 'Diamonds',
    Hearts = 'Hearts',
    Spades = 'Spades',
}

// 카드 값 enum
export enum CardValue {
    Ace = 1,
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
    Nine = 9,
    Ten = 10,
    Jack = 11,
    Queen = 12,
    King = 13,
}

// 포커 핸드 결과 클래스
export class PokerHandResult {
    constructor(
        public pokerHand: PokerHand = PokerHand.None,
        public score: number = 0,
        public multiplier: number = 0,
        public usedCards: Card[] = [],
        public unUsedCards: Card[] = [],
        public unUsedPokerHand: PokerHand = PokerHand.None
    ) { }
}

// 핸드 컨텍스트 클래스 (조커 효과 적용용)
export class HandContext {
    public playedCards: Card[] = [];
    public unUsedCards: Card[] = [];
    public currentCardData: Card | null = null;
    public multiplier: number = 1;
    public chips: number = 0;
    public pokerHand: PokerHand = PokerHand.None;
    public unUsedPokerHand: PokerHand = PokerHand.None;
    public remainingDiscards: number = 0;
    public remainingDeck: number = 0;
    public remainingSevens: number = 0;
    public randomValue: number = 0;

    // 추가된 속성들 (클라이언트와 동일)
    public unUsedHandType: string = '';
    public roundNumber: number = 1;
    public ownedJokers: string[] = [];

    // 사용하지 않은 카드 중 특정 무늬의 개수를 반환
    countUnUsedCardsOfSuit(suit: CardType): number {
        return this.unUsedCards.filter(card => card.suit === suit).length;
    }

    // 족보에 사용한 카드 중 Ace가 몇 개인지 반환
    countAcesInUsedCards(): number {
        return this.playedCards.filter(card => card.rank === 1).length;
    }

    // 족보에 사용한 카드 중 특정 무늬가 몇 개인지 반환
    countSuitInUsedCards(suit: CardType): number {
        return this.playedCards.filter(card => card.suit === suit).length;
    }

    // 족보에 사용한 카드가 count장이고, 모든 카드의 무늬가 인자와 같으면 true 반환
    isUsedCardsOfSuitCount(suit: CardType, count: number): boolean {
        if (!this.playedCards || this.playedCards.length !== count) {
            return false;
        }
        for (const card of this.playedCards) {
            if (card.suit !== suit) {
                return false;
            }
        }
        return true;
    }

    // 현재 카드가 짝수 랭크인지 확인
    isCurrentCardDataEvenRank(): boolean {
        if (!this.currentCardData) return false;
        return this.currentCardData.rank % 2 === 0;
    }

    // Pair 관련 체크 함수들
    hasPairInPlayedCards(): boolean {
        return this.isPairHand(this.pokerHand);
    }

    hasPairInUnUsedCards(): boolean {
        return this.isPairHand(this.unUsedPokerHand);
    }

    // Triple 관련 체크 함수들
    hasTripleInPlayedCards(): boolean {
        return this.isTripleHand(this.pokerHand);
    }

    hasTripleInUnUsedCards(): boolean {
        return this.isTripleHand(this.unUsedPokerHand);
    }

    // 주어진 족보가 pair를 포함하는지 확인하는 헬퍼 메서드
    private isPairHand(hand: PokerHand): boolean {
        switch (hand) {
            case PokerHand.OnePair:
            case PokerHand.TwoPair:
            case PokerHand.ThreeOfAKind:
            case PokerHand.FullHouse:
            case PokerHand.FourOfAKind:
                return true;
            default:
                return false;
        }
    }

    // 주어진 족보가 triple을 포함하는지 확인하는 헬퍼 메서드
    private isTripleHand(hand: PokerHand): boolean {
        switch (hand) {
            case PokerHand.ThreeOfAKind:
            case PokerHand.FullHouse:
            case PokerHand.FourOfAKind:
                return true;
            default:
                return false;
        }
    }
} 