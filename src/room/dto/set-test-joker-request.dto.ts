import { PokerHand } from '../poker-types';

export class SetTestJokerRequestDto {
    roomId: string;
    testJokerIds: string[]; // 5개 슬롯의 테스트 조커 ID
    forcedHand?: PokerHand; // 강제로 나눠줄 족보 (선택사항)
}