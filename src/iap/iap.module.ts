import { Module } from '@nestjs/common';
import { IAPController } from './iap.controller';
import { IAPService } from './iap.service';
import { UserModule } from '../user/user.module';
import { RoomModule } from '../room/room.module';

@Module({
    imports: [UserModule, RoomModule],
    controllers: [IAPController],
    providers: [IAPService],
    exports: [IAPService],
})
export class IAPModule { }
