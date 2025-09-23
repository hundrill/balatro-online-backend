import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { ChallengeManagerService } from './challenge-manager.service';
import { ChallengeService } from './challenge.service';
import { ChallengeController } from './challenge.controller';

@Module({
    imports: [PrismaModule],
    controllers: [ChallengeController],
    providers: [ChallengeManagerService, ChallengeService],
    exports: [ChallengeManagerService, ChallengeService],
})
export class ChallengeModule { }
