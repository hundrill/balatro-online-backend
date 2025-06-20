import { LobbyService } from './lobby.service';
export declare class LobbyController {
    private readonly lobbyService;
    constructor(lobbyService: LobbyService);
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
