import { BaseSocketDto } from "./base-socket.dto";

export class CardPurchasedResponse extends BaseSocketDto {
    override eventName = 'cardPurchased';
    userId: string;
    cardId: string;
    cardType: string;
    price: number;
    cardName: string;
    cardDescription: string;
    cardSprite: number;
    constructor(init?: Partial<CardPurchasedResponse>) {
        super();
        Object.assign(this, init);
    }
}
