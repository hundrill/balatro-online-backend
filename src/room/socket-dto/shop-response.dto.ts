import { BaseSocketDto } from './base-socket.dto';

export class ShopResponseDto extends BaseSocketDto {
    override responseEventName = 'ShopResponse';

    shopCardIds: string[];
    round: number;

    constructor(init?: Partial<ShopResponseDto>) {
        super();
        Object.assign(this, init);
    }
} 