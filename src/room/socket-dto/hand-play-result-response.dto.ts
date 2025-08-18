import { BaseSocketDto } from './base-socket.dto';
import { CardData } from '../deck.util';
import { BettingResponseDto } from './betting-response.dto';

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
    totalDeck: number;
    remainingSevens: number;
    randomValue: number;
    nickname: string;
}

export class HandPlayResultResponseDto extends BaseSocketDto {
    override responseEventName = 'HandPlayResultResponse';

    roundResult: Record<string, RoundResult>;
    round: number;
    bettingResponse?: BettingResponseDto;

    constructor(init?: Partial<HandPlayResultResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
