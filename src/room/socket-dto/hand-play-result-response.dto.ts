import { BaseSocketDto } from './base-socket.dto';
import { CardData } from '../deck.util';

// RoundResult 타입 정의
export interface RoundResult {
    isWinner: number;
    usedHand: CardData[];
    fullHand: CardData[];
    score: number;
    chipsGain: number;
    finalChips: number;
    finalFunds: number;
    fundsGain: number;
    remainingDiscards: number;
    remainingDeck: number;
    remainingSevens: number;
    randomValue: number;
}

export class HandPlayResultResponseDto extends BaseSocketDto {
    override responseEventName = 'HandPlayResultResponse';

    roundResult: Record<string, RoundResult>;
    shopCardIds: string[];
    round: number;

    constructor(init?: Partial<HandPlayResultResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
