import { PrismaService } from '../prisma.service';
export declare class RoomService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: number;
        createdAt: Date;
        name: string;
        channelId: number;
        status: string;
    }[]>;
    create(data: {
        channelId: number;
        name: string;
        status: string;
    }): Promise<{
        id: number;
        createdAt: Date;
        name: string;
        channelId: number;
        status: string;
    }>;
}
