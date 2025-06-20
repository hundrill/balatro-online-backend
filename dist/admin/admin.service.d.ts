import { PrismaService } from '../prisma.service';
export declare class AdminService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getStats(): Promise<{
        userCount: number;
        channelCount: number;
        roomCount: number;
        gameHistoryCount: number;
    }>;
}
