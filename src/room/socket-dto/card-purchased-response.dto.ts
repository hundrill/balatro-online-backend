import { BaseSocketDto } from "./base-socket.dto";

export class CardPurchasedResponseDto extends BaseSocketDto {
    override eventName = 'CardPurchasedResponse';
    userId: string;
    cardId: string;
    cardType: string;
    price: number;
    cardName: string;
    cardDescription: string;
    cardSprite: number;
    constructor(init?: Partial<CardPurchasedResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
