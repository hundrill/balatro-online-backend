import { Module } from '@nestjs/common';
import { DevToolsController } from './dev-tools.controller';
import { DevToolsService } from './dev-tools.service';
import { PrismaModule } from '../prisma.module';
import { RoomModule } from '../room/room.module';

@Module({
    imports: [PrismaModule, RoomModule],
    controllers: [DevToolsController],
    providers: [DevToolsService],
})
export class DevToolsModule { } 