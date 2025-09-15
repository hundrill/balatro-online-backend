import { Controller, Post, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IAPService } from './iap.service';
import { IAPBuyRequestDto } from './dto/iap-buy-request.dto';
import { IAPBuyResponseDto } from './dto/iap-buy-response.dto';

@Controller('iap')
@UseGuards(JwtAuthGuard)
export class IAPController {
    private readonly logger = new Logger(IAPController.name);

    constructor(private readonly iapService: IAPService) { }

    @Post('buy')
    async buyItem(
        @Body() iapBuyRequest: IAPBuyRequestDto,
        @Request() req: any
    ): Promise<IAPBuyResponseDto> {
        try {
            const userId = req.user.userId;

            this.logger.log(`[buyItem] userId=${userId}, itemId=${iapBuyRequest.itemId}`);

            const result = await this.iapService.handleIAPBuyRequest(userId, iapBuyRequest);

            return result;
        } catch (error) {
            this.logger.error(`[buyItem] Error: userId=${req.user?.userId}`, error);
            return {
                success: false,
                message: 'IAP 구매 중 오류가 발생했습니다.',
                finalChips: 0
            };
        }
    }
}
