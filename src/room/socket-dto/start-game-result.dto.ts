import { CardData } from '../deck.util';
import { BaseSocketDto } from './base-socket.dto';

export interface UserInfo {
    cards?: CardData[]; // 내 정보에만 있음
    chipGain: number;  // 현재 칩 타입에 따른 칩 획득량
    chipNow: number;   // 현재 칩 타입에 따른 칩 수량
    funds: number;     // 자금
}

export class StartGameResultDto extends BaseSocketDto {
    override responseEventName = 'StartGameResult';
    round: number;
    totalDeckCards: number; // 내 덱의 총 카드 수
    seedAmount: number;     // 시드 머니
    bettingAmount: number;  // 베팅 머니
    chipsTable: number;     // 테이블의 총 칩
    chipsRound: number;     // 현재 라운드에서 획득 가능한 판돈
    userInfo: Record<string, UserInfo>; // 유저별 정보
    constructor(init?: Partial<StartGameResultDto>) {
        super();
        Object.assign(this, init);
    }
}
