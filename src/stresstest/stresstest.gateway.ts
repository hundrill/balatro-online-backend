import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { StressTestRequestDto } from './dto/stress-test-request.dto';
import { StressTestResponseDto } from './dto/stress-test-response.dto';
import { StressTestService } from './stresstest.service';

@WebSocketGateway({
    cors: true,
    pingInterval: 60000 * 5 + 5000,
    pingTimeout: 60000 * 5,
    transports: ['websocket']
    // transports: ['polling']
})
export class StressTestGateway {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(StressTestGateway.name);

    constructor(private readonly stressTestService: StressTestService) { }

    @SubscribeMessage(StressTestRequestDto.requestEventName)
    async handleStressTestRequest(
        @MessageBody() data: StressTestRequestDto,
        @ConnectedSocket() client: Socket,
    ) {
        const startTime = Date.now();

        this.logger.log(`[StressTest] 요청 수신: messageId=${data.messageCount}, complexity=${data.complexity}, payloadSize=${data.payload.length}`);

        try {
            // 스트레스 테스트 실행
            const result = await this.stressTestService.runStressTest(
                data.messageCount,
                data.payload,
                data.complexity
            );

            // 응답 생성
            const response = new StressTestResponseDto();
            response.success = result.success;
            response.messageId = data.messageCount;
            response.echo = data.payload;
            response.processingTime = result.processingTime;
            response.primesFound = result.primesFound;

            // 클라이언트에 응답 전송
            client.emit('Response', response);

            const totalTime = Date.now() - startTime;
            this.logger.log(`[StressTest] 응답 전송 완료: messageId=${data.messageCount}, totalTime=${totalTime}ms`);

        } catch (error) {
            this.logger.error(`[StressTest] 처리 중 오류 발생:`, error);

            // 에러 응답
            const errorResponse = new StressTestResponseDto();
            errorResponse.success = false;
            errorResponse.messageId = data.messageCount;
            errorResponse.echo = data.payload;
            errorResponse.processingTime = Date.now() - startTime;
            errorResponse.primesFound = 0;

            client.emit('Response', errorResponse);
        }
    }
} 