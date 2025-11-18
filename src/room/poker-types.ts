import { CardData } from "./deck.util";

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
    Any = 'Any',
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
        public usedCards: CardData[] = [],
        public unUsedCards: CardData[] = [],
        public unUsedPokerHand: PokerHand = PokerHand.None
    ) { }
}

export type RandomValue = { id: string; value: number };

// 핸드 컨텍스트 클래스 (조커 효과 적용용)
export class HandContext {
    public userId: string = '';  // 유저 ID 추가
    public playedCards: CardData[] = [];
    public unUsedCards: CardData[] = [];
    public currentCardData: CardData | null = null;
    public redrawCardData: CardData[] = [];
    public discardCardData: CardData[] = [];
    public multiplier: number = 1;
    public chips: number = 0;
    public pokerHand: PokerHand = PokerHand.None;
    public unUsedPokerHand: PokerHand = PokerHand.None;
    public remainingDiscards: number = 0;
    public remainingDeck: CardData[] = [];
    public totalDeck: number = 0;
    public randomValue: RandomValue[] = [];

    // 추가된 속성들 (클라이언트와 동일)
    public unUsedHandType: string = '';
    public roundNumber: number = 1;
    public ownedJokers: string[] = [];

    // 사용하지 않은 카드 중 특정 무늬의 개수를 반환
    countSuitInUnUsedCards(suit: CardType): number {
        return this.unUsedCards.filter(card => card.suit === suit || suit === CardType.Any).length;
    }

    countNumberInUnUsedCards(number: number): number {
        return this.unUsedCards.filter(card => card.rank === number).length;
    }

    // 남은 덱에서 특정 숫자(랭크)의 카드가 몇 개 있는지 반환
    countNumberInDeckCardRemainCount(number: number): number {
        return this.remainingDeck.filter(card => card.rank === number).length;
    }

    // 족보에 사용한 카드 중 특정 무늬가 몇 개인지 반환
    countSuitInUsedCards(suit: CardType): number {
        return this.playedCards.filter(card => card.suit === suit || suit === CardType.Any).length;
    }

    countNumberInUsedCards(number: number): number {
        return this.playedCards.filter(card => card.rank === number).length;
    }
} 