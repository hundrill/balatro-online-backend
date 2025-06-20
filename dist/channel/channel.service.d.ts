import { PrismaService } from '../prisma.service';
export declare class ChannelService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: number;
        name: string;
    }[]>;
    create(name: string): Promise<{
        id: number;
        name: string;
    }>;
}
