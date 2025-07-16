import { BaseSocketDto } from './base-socket.dto';

export class StartGameResponse extends BaseSocketDto {
    override eventName = 'startGame';
    myCards: any[];
    opponents: string[];
    round: number;
    silverSeedChip: number;
    goldSeedChip: number;
    userFunds: Record<string, number>;
    constructor(init?: Partial<StartGameResponse>) {
        super();
        Object.assign(this, init);
    }
}
