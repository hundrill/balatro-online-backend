import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma.service';

describe('UserService', () => {
    let service: UserService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [UserService, PrismaService],
        }).compile();

        service = module.get<UserService>(UserService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('findById should call prisma.user.findUnique', async () => {
        const spy = jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
        await service.findById(1);
        expect(spy).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('findByEmail should call prisma.user.findUnique', async () => {
        const spy = jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
        await service.findByEmail('test@example.com');
        expect(spy).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('create should call prisma.user.create', async () => {
        const spy = jest.spyOn(prisma.user, 'create').mockResolvedValue(null);
        await service.create({ email: 'a', passwordHash: 'b', nickname: 'c' });
        expect(spy).toHaveBeenCalledWith({ data: { email: 'a', passwordHash: 'b', nickname: 'c' } });
    });
}); 