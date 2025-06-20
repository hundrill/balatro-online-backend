import { ChannelService } from './channel.service';
export declare class ChannelController {
    private readonly channelService;
    constructor(channelService: ChannelService);
    findAll(): Promise<{
        id: number;
        name: string;
    }[]>;
    create(name: string): Promise<{
        id: number;
        name: string;
    }>;
}
