import { PrismaService } from '../prisma.service';
export declare class GameHistoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: number;
        roomId: number;
        startedAt: Date;
        endedAt: Date | null;
    }[]>;
    create(data: {
        roomId: number;
        startedAt: Date;
        endedAt?: Date;
    }): Promise<{
        id: number;
        roomId: number;
        startedAt: Date;
        endedAt: Date | null;
    }>;
}
