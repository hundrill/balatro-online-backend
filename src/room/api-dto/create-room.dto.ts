import { ChipType } from '../room.service';

export class CreateRoomDto {
  name: string;
  maxPlayers: number;
  chipType: ChipType;  // 방에서 사용할 칩 타입
  seedAmount: number;  // 시드 머니
  bettingAmount: number;  // 베팅 머니
  // 필요시 비밀번호 등 추가 가능
}
