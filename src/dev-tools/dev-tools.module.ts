import { Module, forwardRef } from '@nestjs/common';
import { DevToolsController } from './dev-tools.controller';
import { DashboardController } from './dashboard.controller';
import { CardsController } from './cards.controller';
import { SettingsController } from './settings.controller';
import { DevToolsService } from './dev-tools.service';
import { RoomModule } from '../room/room.module';
import { CommonModule } from '../common/common.module';
import { FeedbackService } from './feedback.service';

@Module({
    imports: [
        forwardRef(() => RoomModule),
        CommonModule,
    ],
    controllers: [DevToolsController, DashboardController, CardsController, SettingsController],
    providers: [DevToolsService, FeedbackService],
    exports: [DevToolsService],
})
export class DevToolsModule { } 