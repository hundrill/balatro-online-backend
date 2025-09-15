export class CreateRoomResponseDto {
    success: boolean;
    roomId: string;
    room: {
        roomId: string;
        name: string;
        maxPlayers: number;
        players: number;
        status: string;
        createdAt: number;
        seedChip: number;
        chipType: string;
    };
}
