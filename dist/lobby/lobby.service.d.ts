import { ChannelService } from '../channel/channel.service';
import { RoomService } from '../room/room.service';
export declare class LobbyService {
    private readonly channelService;
    private readonly roomService;
    constructor(channelService: ChannelService, roomService: RoomService);
    getLobbyInfo(): Promise<{
        channels: {
            id: number;
            name: string;
        }[];
        rooms: {
            id: number;
            createdAt: Date;
            name: string;
            channelId: number;
            status: string;
        }[];
    }>;
}
