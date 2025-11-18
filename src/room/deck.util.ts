import { CardType, PokerHand } from './poker-types';

export type CardData = {
  suit: CardType;
  rank: number;
  id: number;
  changeSuit(newSuit: CardType): void;
};

export function createCardData(suit: CardType, rank: number, id: number): CardData {
  return {
    suit,
    rank,
    id,
    changeSuit(newSuit: CardType) {
      this.suit = newSuit;
    },
  };
}

export function createDeck(): CardData[] {
  const suits = [CardType.Clubs, CardType.Diamonds, CardType.Hearts, CardType.Spades];
  const deck: CardData[] = [];
  let id = 0;
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push(createCardData(suit, rank, id++));
    }
  }
  return deck;
}

export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * 특정 족보로 8장의 카드를 생성합니다.
 */
export function createSpecificHand(pokerHand: PokerHand): CardData[] {
  let id = 0;

  switch (pokerHand) {
    case PokerHand.FourOfAKind:
      return [
        createCardData(CardType.Spades, 7, id++),
        createCardData(CardType.Hearts, 7, id++),
        createCardData(CardType.Diamonds, 7, id++),
        createCardData(CardType.Clubs, 7, id++),
        createCardData(CardType.Spades, 2, id++),
        createCardData(CardType.Hearts, 3, id++),
        createCardData(CardType.Diamonds, 4, id++),
        createCardData(CardType.Clubs, 5, id++),
      ];

    case PokerHand.FullHouse:
      return [
        createCardData(CardType.Spades, 8, id++),
        createCardData(CardType.Hearts, 8, id++),
        createCardData(CardType.Diamonds, 8, id++),
        createCardData(CardType.Clubs, 9, id++),
        createCardData(CardType.Spades, 9, id++),
        createCardData(CardType.Hearts, 2, id++),
        createCardData(CardType.Diamonds, 3, id++),
        createCardData(CardType.Clubs, 4, id++),
      ];

    case PokerHand.Flush:
      return [
        createCardData(CardType.Spades, 2, id++),
        createCardData(CardType.Spades, 5, id++),
        createCardData(CardType.Spades, 7, id++),
        createCardData(CardType.Spades, 9, id++),
        createCardData(CardType.Spades, 11, id++),
        createCardData(CardType.Hearts, 3, id++),
        createCardData(CardType.Diamonds, 4, id++),
        createCardData(CardType.Clubs, 6, id++),
      ];

    case PokerHand.Straight:
      return [
        createCardData(CardType.Spades, 5, id++),
        createCardData(CardType.Hearts, 6, id++),
        createCardData(CardType.Diamonds, 7, id++),
        createCardData(CardType.Clubs, 8, id++),
        createCardData(CardType.Spades, 9, id++),
        createCardData(CardType.Hearts, 2, id++),
        createCardData(CardType.Diamonds, 3, id++),
        createCardData(CardType.Clubs, 4, id++),
      ];

    case PokerHand.ThreeOfAKind:
      return [
        createCardData(CardType.Spades, 10, id++),
        createCardData(CardType.Hearts, 10, id++),
        createCardData(CardType.Diamonds, 10, id++),
        createCardData(CardType.Clubs, 2, id++),
        createCardData(CardType.Spades, 3, id++),
        createCardData(CardType.Hearts, 4, id++),
        createCardData(CardType.Diamonds, 5, id++),
        createCardData(CardType.Clubs, 6, id++),
      ];

    case PokerHand.TwoPair:
      return [
        createCardData(CardType.Spades, 11, id++),
        createCardData(CardType.Hearts, 11, id++),
        createCardData(CardType.Diamonds, 12, id++),
        createCardData(CardType.Clubs, 12, id++),
        createCardData(CardType.Spades, 2, id++),
        createCardData(CardType.Hearts, 3, id++),
        createCardData(CardType.Diamonds, 4, id++),
        createCardData(CardType.Clubs, 5, id++),
      ];

    case PokerHand.OnePair:
      return [
        createCardData(CardType.Spades, 13, id++),
        createCardData(CardType.Hearts, 13, id++),
        createCardData(CardType.Diamonds, 2, id++),
        createCardData(CardType.Clubs, 3, id++),
        createCardData(CardType.Spades, 4, id++),
        createCardData(CardType.Hearts, 5, id++),
        createCardData(CardType.Diamonds, 6, id++),
        createCardData(CardType.Clubs, 7, id++),
      ];

    case PokerHand.StraightFlush:
      return [
        createCardData(CardType.Spades, 6, id++),
        createCardData(CardType.Spades, 7, id++),
        createCardData(CardType.Spades, 8, id++),
        createCardData(CardType.Spades, 9, id++),
        createCardData(CardType.Spades, 10, id++),
        createCardData(CardType.Hearts, 2, id++),
        createCardData(CardType.Diamonds, 3, id++),
        createCardData(CardType.Clubs, 4, id++),
      ];

    default:
      // 기본적으로 랜덤 카드 반환
      return createDeck().slice(0, 8);
  }
}
