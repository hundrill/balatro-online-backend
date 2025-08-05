import { Module } from '@nestjs/common';
import { GameSettingsService } from './services/game-settings.service';
import { PrismaModule } from '../prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [GameSettingsService],
    exports: [GameSettingsService],
})
export class CommonModule { } 