import { BaseSocketDto } from './base-socket.dto';

export class StartGameResponseDto extends BaseSocketDto {
    override eventName = 'StartGameResponse';
    myCards: any[];
    opponents: string[];
    round: number;
    silverSeedChip: number;
    goldSeedChip: number;
    userFunds: Record<string, number>;
    constructor(init?: Partial<StartGameResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
