import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Param,
  Delete,
  Logger,
} from '@nestjs/common';
import { RoomService, ChipType } from './room.service';
import { SpecialCardData, SpecialCardManagerService } from './special-card-manager.service';
import { CreateRoomRequestDto } from './dto/create-room-request.dto';
import { CreateRoomResponseDto } from './dto/create-room-response.dto';
import { ConfigResponseDto, SpecialCardApiDto } from './dto/config-response.dto';
import { ConfigRequestDto } from './dto/config-request.dto';
import { RoomListResponseDto } from './dto/room-list-response.dto';
import { SetTestJokerRequestDto } from './dto/set-test-joker-request.dto';
import { SetTestJokerResponseDto } from './dto/set-test-joker-response.dto';
import { PrismaService } from '../prisma.service';
import { Query } from '@nestjs/common';
import { Request } from 'express';
import { RoomValidator } from '../common/validators/room.validator';
import { GameSettingsService } from '../common/services/game-settings.service';

@Controller('rooms')
export class RoomController {
  private readonly logger = new Logger(RoomController.name);

  constructor(
    private readonly roomService: RoomService,
    private readonly specialCardManagerService: SpecialCardManagerService,
    private readonly prisma: PrismaService,
  ) { }

  @Get()
  async findAll() {
    try {
      const rooms = await this.roomService.findAll();
      return { success: true, rooms };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Error in GET /rooms', error.stack);
      } else {
        this.logger.error('Error in GET /rooms', String(error));
      }
      throw error;
    }
  }

  /* 주석 제거 하지 말 것
  @Post()
  async create(
    @Body('channelId') channelId: number,
    @Body('name') name: string,
    @Body('status') status: string,
  ) {
    try {
      this.logger.log(`POST /rooms - Creating room: ${name}`);
      const room = await this.roomService.create({ channelId, name, status });
      return { success: true, room };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in POST /rooms - Creating room: ${name}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Error in POST /rooms - Creating room: ${name}`,
          String(error),
        );
      }
      throw error;
    }
  }
*/

  // Redis 기반 방 생성
  @Post('create')
  async createRoom(@Body() dto: CreateRoomRequestDto): Promise<CreateRoomResponseDto> {
    try {

      // 입력 데이터 검증
      RoomValidator.validateCreateRoomData(dto);

      const room = await this.roomService.createRoom(
        dto.name,
        dto.maxPlayers,
        dto.chipType,
        dto.seedAmount,
        dto.timeLimit
      );

      const response: CreateRoomResponseDto = {
        success: true,
        roomId: room.roomId,
        room: {
          roomId: room.roomId,
          name: room.name,
          maxPlayers: room.maxPlayers,
          players: 0,
          status: 'waiting',
          createdAt: room.createdAt,
          seedChip: room.seedAmount,
          chipType: room.chipType.toString()
        }
      };

      return response;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in POST /rooms/create - Creating room: ${dto.name}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Error in POST /rooms/create - Creating room: ${dto.name}`,
          String(error),
        );
      }
      throw error;
    }
  }



  // Redis 기반 방 목록 조회
  @Get('redis')
  async findAllRoomsInRedis(): Promise<RoomListResponseDto> {
    try {
      const rooms = await this.roomService.findAllRoomsInRedis();
      return { success: true, rooms };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Error in GET /rooms/redis', error.stack);
      } else {
        this.logger.error('Error in GET /rooms/redis', String(error));
      }
      throw error;
    }
  }

  // 스페셜카드 정보 조회
  @Get('config')
  async getSpecialCards(@Query() configRequest: ConfigRequestDto): Promise<ConfigResponseDto> {
    try {

      // 특별 카드 데이터 가져오기
      const specialCards = this.specialCardManagerService.getActiveSpecialCards();
      const specialCardsApi: SpecialCardApiDto[] = specialCards.map((card: SpecialCardData) => ({
        id: card.id,
        name: card.name,
        description: configRequest.language === 'in' ? card.descriptionId : configRequest.language === 'en' ? card.descriptionEn : card.descriptionKo,
        price: card.price,
        sprite: card.sprite,
        type: card.type.toString(),
        baseValue: card.baseValue,
        increase: card.increase,
        decrease: card.decrease,
        maxValue: card.maxValue,
        needCardCount: card.needCardCount || 0,
        enhanceChips: card.enhanceChips || 0,
        enhanceMul: card.enhanceMul || 0,
        isActive: card.isActive !== false,

        conditionTypes: card.conditionTypes?.map((conditionType: any) => conditionType.toString()) || [],
        conditionValues: card.conditionValues || [[]],
        conditionOperators: card.conditionOperators?.map((operatorType: any) => operatorType.toString()) || [],
        conditionNumericValues: card.conditionNumericValues || [],
        effectTimings: card.effectTimings?.map((timing: any) => timing.toString()) || [],
        effectTypes: card.effectTypes?.map((effectType: any) => effectType.toString()) || [],
        effectTypesOrigin: card.effectTypes?.map((effectType: any) => effectType.toString()) || [],
        effectOnCards: card.effectOnCards || [],
        effectValues: card.effectValues || [[]],
        effectByCounts: card.effectByCounts || [],
      }));

      // 처음 5개 카드의 상세 로그 출력
      for (let i = 0; i < Math.min(5, specialCardsApi.length); i++) {
        const card = specialCardsApi[i];
        this.logger.log(`GET /rooms/config - Card ${i + 1}:`, {
          id: card.id,
          name: card.name,
          description: card.description,
          price: card.price,
          sprite: card.sprite,
          type: card.type,
          baseValue: card.baseValue,
          increase: card.increase,
          decrease: card.decrease,
          maxValue: card.maxValue,
          needCardCount: card.needCardCount,
          enhanceChips: card.enhanceChips,
          enhanceMul: card.enhanceMul,
          isActive: card.isActive,
          effectTimings: card.effectTimings,
          effectTypes: card.effectTypes,
          effectValues: card.effectValues,
          effectOnCards: card.effectOnCards,
          conditionTypes: card.conditionTypes,
          conditionValues: card.conditionValues,
          conditionOperators: card.conditionOperators,
          conditionNumericValues: card.conditionNumericValues
        });
      }

      // 채널별 씨드머니 데이터 가져오기
      const gameSettingsService = new GameSettingsService(this.prisma);

      const channelSeedMoney = await gameSettingsService.getChannelSeedMoney();

      const response: ConfigResponseDto = {
        success: true,
        code: 0,
        message: 'Special cards data retrieved successfully',
        specialCards: specialCardsApi,
        channelSeedMoney: channelSeedMoney
      };

      console.log('getSpecialCards configRequest:', configRequest.language);

      return response;
    } catch (error: unknown) {
      this.logger.error('Error in GET /rooms/config', error instanceof Error ? error.stack : String(error));

      const errorResponse: ConfigResponseDto = {
        success: false,
        code: 1000,
        message: 'Internal server error while fetching special cards',
        specialCards: [],
        channelSeedMoney: {
          beginner: { seedMoney1: 15, seedMoney2: 30, seedMoney3: 60, seedMoney4: 90 },
          intermediate: { seedMoney1: 120, seedMoney2: 180, seedMoney3: 240, seedMoney4: 300 },
          advanced: { seedMoney1: 420, seedMoney2: 540, seedMoney3: 660, seedMoney4: 780 },
          expert: { seedMoney1: 990, seedMoney2: 1200, seedMoney3: 1410, seedMoney4: 1620 },
          royal: { seedMoney1: 2100, seedMoney2: 2100, seedMoney3: 2100, seedMoney4: 2100 }
        }
      };

      return errorResponse;
    }
  }

  // Redis 기반 방 삭제
  @Delete(':roomId')
  async deleteRoom(@Param('roomId') roomId: string) {
    try {
      const result = await this.roomService.deleteRoom(roomId);
      return { success: true, ...result };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error in DELETE /rooms/${roomId}`, error.stack);
      } else {
        this.logger.error(`Error in DELETE /rooms/${roomId}`, String(error));
      }
      throw error;
    }
  }

  // 방 유저 리스트 조회
  // @Get(':roomId/users')
  // async getRoomUsers(@Param('roomId') roomId: string) {
  //   try {
  //     this.logger.log(`GET /rooms/${roomId}/users - Fetching users for room`);
  //     const users = await this.roomService.getRoomUsers(roomId);
  //     return { success: true, users };
  //   } catch (error: unknown) {
  //     if (error instanceof Error) {
  //       this.logger.error(`Error in GET /rooms/${roomId}/users`, error.stack);
  //     } else {
  //       this.logger.error(`Error in GET /rooms/${roomId}/users`, String(error));
  //     }
  //     throw error;
  //   }
  // }

  // === 테스트 조커 관련 API ===

  /**
   * 테스트 조커 ID를 설정합니다.
   */
  @Post(':roomId/test-joker')
  async setTestJoker(
    @Param('roomId') roomId: string,
    @Body() setTestJokerRequest: SetTestJokerRequestDto
  ): Promise<SetTestJokerResponseDto> {
    try {

      this.logger.log(`[setTestJoker] roomId=${roomId}, testJokerIds=${setTestJokerRequest.testJokerIds}, forcedHand=${setTestJokerRequest.forcedHand}`);

      const result = this.roomService.setTestJokerIds(roomId, setTestJokerRequest.testJokerIds);

      this.roomService.setForcedHand(roomId, setTestJokerRequest.forcedHand || null);

      return {
        success: result.success,
        message: result.message,
        testJokerIds: result.testJokerIds
      };
    } catch (error) {
      this.logger.error(`[setTestJoker] Error: roomId=${roomId}`, error);
      return {
        success: false,
        message: '테스트 조커 설정 중 오류가 발생했습니다.',
        testJokerIds: []
      };
    }
  }
}
