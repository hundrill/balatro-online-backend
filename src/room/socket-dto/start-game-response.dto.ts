import { Card } from '../deck.util';
import { BaseSocketDto } from './base-socket.dto';

export interface UserInfo {
    cards?: Card[]; // 내 정보에만 있음
    userFunds: number;
    silverChipGain: number;
    goldChipGain: number;
    silverChipNow: number;
    goldChipNow: number;
}

export class StartGameResponseDto extends BaseSocketDto {
    override responseEventName = 'StartGameResponse';
    round: number;
    totalDeckCards: number; // 내 덱의 총 카드 수
    silverSeedChip: number;
    goldSeedChip: number;
    silverTableChip: number;
    goldTableChip: number;
    userInfo: Record<string, UserInfo>; // 유저별 정보
    constructor(init?: Partial<StartGameResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
