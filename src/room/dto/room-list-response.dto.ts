export class RoomDataDto {
    roomId: string;
    name: string;
    maxPlayers: number;
    players: number;
    status: string;
    createdAt: number;
    seedChip?: number; // 시드 칩 정보 (선택적)
    chipType?: number; // 칩 타입
    seedAmount?: number; // 시드 머니
    bettingAmount?: number; // 베팅 머니
}

export class RoomListResponseDto {
    success: boolean;
    rooms: RoomDataDto[];
    message?: string;
} 