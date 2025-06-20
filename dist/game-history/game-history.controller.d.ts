import { GameHistoryService } from './game-history.service';
export declare class GameHistoryController {
    private readonly gameHistoryService;
    constructor(gameHistoryService: GameHistoryService);
    findAll(): Promise<{
        id: number;
        roomId: number;
        startedAt: Date;
        endedAt: Date | null;
    }[]>;
    create(roomId: number, startedAt: string, endedAt?: string): Promise<{
        id: number;
        roomId: number;
        startedAt: Date;
        endedAt: Date | null;
    }>;
}
