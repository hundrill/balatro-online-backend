import { CardType } from './poker-types';

export type Card = { suit: CardType; rank: number; id: number };

export function createDeck(): Card[] {
  const suits = [CardType.Clubs, CardType.Diamonds, CardType.Hearts, CardType.Spades];
  const deck: Card[] = [];
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
