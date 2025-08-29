import { BaseSocketDto } from './base-socket.dto';

export class IAPBuyResponseDto extends BaseSocketDto {
    override responseEventName = 'IAPBuyResponse';
    finalChips: number;

    constructor(init?: Partial<IAPBuyResponseDto>) {
        super();
        Object.assign(this, init);
    }
} 