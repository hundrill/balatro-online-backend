import { Module, forwardRef } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { RoomGateway } from './room.gateway';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { DevToolsModule } from '../dev-tools/dev-tools.module';
import { CommonModule } from '../common/common.module';
import { ChallengeModule } from '../challenge/challenge.module';
import { PaytableService } from './paytable.service';
import { HandEvaluatorService } from './hand-evaluator.service';
import { SpecialCardManagerService } from './special-card-manager.service';

@Module({
  imports: [UserModule, AuthModule, forwardRef(() => DevToolsModule), CommonModule, ChallengeModule],
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
