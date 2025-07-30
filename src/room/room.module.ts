import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { RoomGateway } from './room.gateway';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { PaytableService } from './paytable.service';
import { HandEvaluatorService } from './hand-evaluator.service';
import { SpecialCardManagerService } from './special-card-manager.service';

@Module({
  imports: [UserModule, AuthModule],
  providers: [
    RoomService,
    RoomGateway,
    PaytableService,
    HandEvaluatorService,
    SpecialCardManagerService
  ],
  controllers: [RoomController],
  exports: [RoomService, SpecialCardManagerService],
})
export class RoomModule { }
