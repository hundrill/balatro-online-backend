import { RoomService } from './room.service';
export declare class RoomController {
    private readonly roomService;
    constructor(roomService: RoomService);
    findAll(): Promise<{
        id: number;
        createdAt: Date;
        name: string;
        channelId: number;
        status: string;
    }[]>;
    create(channelId: number, name: string, status: string): Promise<{
        id: number;
        createdAt: Date;
        name: string;
        channelId: number;
        status: string;
    }>;
}
