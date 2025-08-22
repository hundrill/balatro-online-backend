import { BettingInfo } from './betting-info.interface';

export interface BettingState {
    currentUser: string | null;
    tableChips: number;
    order: string[];
    completed: Set<string>;
    bets: Map<string, BettingInfo>;
    raiseCounts: Map<string, number>; // 각 유저의 레이스 횟수 추적
    checkUsed: boolean; // check가 사용되었는지 추적
    remainingTableMoney: number; // 레이스 가능한 남은 테이블 머니 한도
    userCallChips: Map<string, number>; // 각 유저별 콜머니
    initialTableChips: number; // 라운드 시작 시 테이블칩 (칩 계산용)
} 