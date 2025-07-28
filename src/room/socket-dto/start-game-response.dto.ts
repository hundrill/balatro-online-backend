import { BaseSocketDto } from './base-socket.dto';

export class StartGameResponseDto extends BaseSocketDto {
    override responseEventName = 'StartGameResponse';
    myCards: any[];
    opponents: {
        userId: string;
        nickname: string | null;
        silverChip: number;
        goldChip: number;
    }[];
    round: number;
    silverSeedChip: number;
    goldSeedChip: number;
    silverTableChip: number;
    goldTableChip: number;
    userFunds: Record<string, number>;
    constructor(init?: Partial<StartGameResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
