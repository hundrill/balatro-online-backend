import { BettingInfo } from './betting-info.interface';

export interface BettingState {
    currentUser: string | null;
    tableChips: number;
    callChips: number;
    order: string[];
    completed: Set<string>;
    bets: Map<string, BettingInfo>;
    raiseCounts: Map<string, number>; // 각 유저의 레이스 횟수 추적
    checkUsed: boolean; // check가 사용되었는지 추적
} 