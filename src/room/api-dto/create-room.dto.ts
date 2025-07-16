export class CreateRoomDto {
  name: string;
  maxPlayers: number;
  silverSeedChip?: number; // 실버 시드 칩
  goldSeedChip?: number; // 골드 시드 칩
  silverBettingChip?: number; // 실버 베팅 칩
  goldBettingChip?: number; // 골드 베팅 칩
  // 필요시 비밀번호 등 추가 가능
}
