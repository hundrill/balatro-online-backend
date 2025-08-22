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
    discardRemainingFunds: number;    // 버리기 남은 횟수에 따른 funds
    rankFunds: number;                // 순위에 따른 funds
    totalFundsGain: number;           // 총 funds 증가량
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

    constructor(init?: Partial<HandPlayResultResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
