import { Module } from '@nestjs/common';
import { StressTestGateway } from './stresstest.gateway';
import { StressTestService } from './stresstest.service';

@Module({
    providers: [StressTestGateway, StressTestService],
    exports: [StressTestService],
})
export class StressTestModule { } 