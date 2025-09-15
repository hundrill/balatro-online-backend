import { BaseSocketDto } from "./base-socket.dto";
import { RoomPhase } from "../room-phase.enum";

export interface RoomUser {
    userId: string;
    nickname: string | null;
    chips: number;  // 현재 칩 타입에 따른 칩 수량
    funds: number;  // 자금
    isPlaying: boolean;
    isRoomOwner: boolean;  // 방장 여부
    ownedCards: string[];
    paytableLevels: Record<string, number>;
    paytableBaseChips: Record<string, number>;
    paytableMultipliers: Record<string, number>;
    cardEnhancements: Record<string, { enhanceChips: number; enhanceMul: number }>;  // 카드별 성장값 추가
}

export class RoomUsersResponseDto extends BaseSocketDto {
    override responseEventName = 'RoomUsersResponse';
    currentPhase: RoomPhase;
    round: number;
    seedAmount: number;
    bettingAmount: number;
    chipsTable: number;
    chipsRound: number;     // 현재 라운드에서 획득 가능한 판돈
    users: RoomUser[];
    constructor(init?: Partial<RoomUsersResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
