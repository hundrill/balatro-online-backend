import { BaseSocketDto } from './base-socket.dto';
import { CardData } from '../deck.util';
import { RandomValue } from '../poker-types';

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
    remainingDeck: CardData[];        // 남은 덱의 모든 카드 정보
    totalDeck: number;
    remainingSevens: number;
    nickname: string;
    randomValue: RandomValue[];
}

export class HandPlayResultResponseDto extends BaseSocketDto {
    override responseEventName = 'HandPlayResultResponse';

    roundResult: Record<string, RoundResult>;
    round: number;
    silverReward?: number;        // SILVER 방 획득보상 (칩)
    silverTotalScore?: number;     // SILVER 방 토탈스코어
    silverTargetScore?: number;    // SILVER 방 목표스코어

    constructor(init?: Partial<HandPlayResultResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
