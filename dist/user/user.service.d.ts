import { PrismaService } from '../prisma.service';
export declare class UserService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: number;
        email: string;
        passwordHash: string;
        nickname: string;
        createdAt: Date;
    }[]>;
    findById(id: number): Promise<{
        id: number;
        email: string;
        passwordHash: string;
        nickname: string;
        createdAt: Date;
    } | null>;
    findByEmail(email: string): Promise<{
        id: number;
        email: string;
        passwordHash: string;
        nickname: string;
        createdAt: Date;
    } | null>;
    create(data: {
        email: string;
        passwordHash: string;
        nickname: string;
    }): Promise<{
        id: number;
        email: string;
        passwordHash: string;
        nickname: string;
        createdAt: Date;
    }>;
}
