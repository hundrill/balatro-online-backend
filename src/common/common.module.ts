import { Module } from '@nestjs/common';
import { GameSettingsService } from './services/game-settings.service';
import { LocalizationService } from './services/localization.service';
import { PrismaModule } from '../prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [GameSettingsService, LocalizationService],
    exports: [GameSettingsService, LocalizationService],
})
export class CommonModule { } 