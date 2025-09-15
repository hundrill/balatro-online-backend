import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { RoomService } from '../room/room.service';
import { IAPBuyRequestDto } from './dto/iap-buy-request.dto';
import { IAPBuyResponseDto } from './dto/iap-buy-response.dto';

@Injectable()
export class IAPService {
    private readonly logger = new Logger(IAPService.name);

    constructor(
        private readonly userService: UserService,
        private readonly roomService: RoomService,
    ) { }

    async handleIAPBuyRequest(userId: string, data: IAPBuyRequestDto): Promise<IAPBuyResponseDto> {
        try {
            const userRoomId = this.roomService.getUserRoomId(userId);
            const isInGameRoom = userRoomId !== null;

            if (isInGameRoom) {
                const roomState = this.roomService.getRoomState(userRoomId);
                const userChips = roomState.userChipsMap.get(userId);

                if (!userChips) {
                    this.logger.error(`[handleIAPBuyRequest] 메모리에서 유저 칩 정보를 찾을 수 없음: userId=${userId}, roomId=${userRoomId}`);
                    throw new Error('User chips not found in memory');
                }

                const currentChips = userChips.chips || 0;
                const newChips = currentChips + 10000;

                userChips.chips = newChips;

                return {
                    success: true,
                    message: 'IAP 구매가 완료되었습니다.',
                    finalChips: newChips
                };
            } else {
                const dbChips = await this.userService.getUserChips(userId);
                if (!dbChips) {
                    this.logger.error(`[handleIAPBuyRequest] DB에서 유저 칩 정보를 찾을 수 없음: userId=${userId}`);
                    throw new Error('User chips not found in database');
                }

                dbChips.goldChip = dbChips.goldChip + 10000;

                await this.userService.saveUserChips(userId, dbChips.silverChip, dbChips.goldChip);

                return {
                    success: true,
                    message: 'IAP 구매가 완료되었습니다.',
                    finalChips: dbChips.goldChip
                };
            }
        } catch (error) {
            this.logger.error(`[handleIAPBuyRequest] Error: userId=${userId}`, error);
            return {
                success: false,
                message: 'IAP 구매 중 오류가 발생했습니다.',
                finalChips: 0
            };
        }
    }
}
