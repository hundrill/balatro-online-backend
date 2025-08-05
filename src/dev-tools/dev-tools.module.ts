import { Module, forwardRef } from '@nestjs/common';
import { DevToolsController } from './dev-tools.controller';
import { DevToolsService } from './dev-tools.service';
import { ApkService } from './apk.service';
import { RoomModule } from '../room/room.module';
import { CommonModule } from '../common/common.module';
import { FeedbackService } from './feedback.service';

@Module({
    imports: [
        forwardRef(() => RoomModule),
        CommonModule,
    ],
    controllers: [DevToolsController],
    providers: [DevToolsService, ApkService, FeedbackService],
    exports: [DevToolsService],
})
export class DevToolsModule { } 