import { CardType, PokerHand } from './poker-types';

export type CardData = { suit: CardType; rank: number; id: number };

export function createDeck(): CardData[] {
  const suits = [CardType.Clubs, CardType.Diamonds, CardType.Hearts, CardType.Spades];
  const deck: CardData[] = [];
  let id = 0;
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank, id: id++ });
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
        { suit: CardType.Spades, rank: 7, id: id++ },
        { suit: CardType.Hearts, rank: 7, id: id++ },
        { suit: CardType.Diamonds, rank: 7, id: id++ },
        { suit: CardType.Clubs, rank: 7, id: id++ },
        { suit: CardType.Spades, rank: 2, id: id++ },
        { suit: CardType.Hearts, rank: 3, id: id++ },
        { suit: CardType.Diamonds, rank: 4, id: id++ },
        { suit: CardType.Clubs, rank: 5, id: id++ }
      ];

    case PokerHand.FullHouse:
      return [
        { suit: CardType.Spades, rank: 8, id: id++ },
        { suit: CardType.Hearts, rank: 8, id: id++ },
        { suit: CardType.Diamonds, rank: 8, id: id++ },
        { suit: CardType.Clubs, rank: 9, id: id++ },
        { suit: CardType.Spades, rank: 9, id: id++ },
        { suit: CardType.Hearts, rank: 2, id: id++ },
        { suit: CardType.Diamonds, rank: 3, id: id++ },
        { suit: CardType.Clubs, rank: 4, id: id++ }
      ];

    case PokerHand.Flush:
      return [
        { suit: CardType.Spades, rank: 2, id: id++ },
        { suit: CardType.Spades, rank: 5, id: id++ },
        { suit: CardType.Spades, rank: 7, id: id++ },
        { suit: CardType.Spades, rank: 9, id: id++ },
        { suit: CardType.Spades, rank: 11, id: id++ },
        { suit: CardType.Hearts, rank: 3, id: id++ },
        { suit: CardType.Diamonds, rank: 4, id: id++ },
        { suit: CardType.Clubs, rank: 6, id: id++ }
      ];

    case PokerHand.Straight:
      return [
        { suit: CardType.Spades, rank: 5, id: id++ },
        { suit: CardType.Hearts, rank: 6, id: id++ },
        { suit: CardType.Diamonds, rank: 7, id: id++ },
        { suit: CardType.Clubs, rank: 8, id: id++ },
        { suit: CardType.Spades, rank: 9, id: id++ },
        { suit: CardType.Hearts, rank: 2, id: id++ },
        { suit: CardType.Diamonds, rank: 3, id: id++ },
        { suit: CardType.Clubs, rank: 4, id: id++ }
      ];

    case PokerHand.ThreeOfAKind:
      return [
        { suit: CardType.Spades, rank: 10, id: id++ },
        { suit: CardType.Hearts, rank: 10, id: id++ },
        { suit: CardType.Diamonds, rank: 10, id: id++ },
        { suit: CardType.Clubs, rank: 2, id: id++ },
        { suit: CardType.Spades, rank: 3, id: id++ },
        { suit: CardType.Hearts, rank: 4, id: id++ },
        { suit: CardType.Diamonds, rank: 5, id: id++ },
        { suit: CardType.Clubs, rank: 6, id: id++ }
      ];

    case PokerHand.TwoPair:
      return [
        { suit: CardType.Spades, rank: 11, id: id++ },
        { suit: CardType.Hearts, rank: 11, id: id++ },
        { suit: CardType.Diamonds, rank: 12, id: id++ },
        { suit: CardType.Clubs, rank: 12, id: id++ },
        { suit: CardType.Spades, rank: 2, id: id++ },
        { suit: CardType.Hearts, rank: 3, id: id++ },
        { suit: CardType.Diamonds, rank: 4, id: id++ },
        { suit: CardType.Clubs, rank: 5, id: id++ }
      ];

    case PokerHand.OnePair:
      return [
        { suit: CardType.Spades, rank: 13, id: id++ },
        { suit: CardType.Hearts, rank: 13, id: id++ },
        { suit: CardType.Diamonds, rank: 2, id: id++ },
        { suit: CardType.Clubs, rank: 3, id: id++ },
        { suit: CardType.Spades, rank: 4, id: id++ },
        { suit: CardType.Hearts, rank: 5, id: id++ },
        { suit: CardType.Diamonds, rank: 6, id: id++ },
        { suit: CardType.Clubs, rank: 7, id: id++ }
      ];

    case PokerHand.StraightFlush:
      return [
        { suit: CardType.Spades, rank: 6, id: id++ },
        { suit: CardType.Spades, rank: 7, id: id++ },
        { suit: CardType.Spades, rank: 8, id: id++ },
        { suit: CardType.Spades, rank: 9, id: id++ },
        { suit: CardType.Spades, rank: 10, id: id++ },
        { suit: CardType.Hearts, rank: 2, id: id++ },
        { suit: CardType.Diamonds, rank: 3, id: id++ },
        { suit: CardType.Clubs, rank: 4, id: id++ }
      ];

    default:
      // 기본적으로 랜덤 카드 반환
      return createDeck().slice(0, 8);
  }
}
