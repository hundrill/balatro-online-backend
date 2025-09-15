import { ChipType } from '../room.service';

export class CreateRoomRequestDto {
  name: string;
  maxPlayers: number;
  chipType: ChipType;  // 방에서 사용할 칩 타입
  seedAmount: number;  // 시드 머니
  timeLimit: number;  // 방 시간 제한
}
