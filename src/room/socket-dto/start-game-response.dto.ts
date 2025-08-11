import { CardData } from '../deck.util';
import { BaseSocketDto } from './base-socket.dto';

export interface UserInfo {
    cards?: CardData[]; // 내 정보에만 있음
    chipGain: number;  // 현재 칩 타입에 따른 칩 획득량
    chipNow: number;   // 현재 칩 타입에 따른 칩 수량
    funds: number;     // 자금
}

export class StartGameResponseDto extends BaseSocketDto {
    override responseEventName = 'StartGameResponse';
    round: number;
    totalDeckCards: number; // 내 덱의 총 카드 수
    seedAmount: number;     // 시드 머니
    bettingAmount: number;  // 베팅 머니
    chipsTable: number;     // 테이블의 총 칩
    userInfo: Record<string, UserInfo>; // 유저별 정보
    constructor(init?: Partial<StartGameResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
