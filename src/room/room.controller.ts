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
import { SpecialCardManagerService } from './special-card-manager.service';
import { CreateRoomDto } from './api-dto/create-room.dto';
import { JoinRoomDto } from './api-dto/join-room.dto';
import { GetSpecialCardsResponseDto, SpecialCardApiDto } from './api-dto/get-special-cards-response.dto';
import { PrismaService } from '../prisma.service';
import { Query } from '@nestjs/common';
import { Request } from 'express';
import { RoomValidator } from '../common/validators/room.validator';

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
      this.logger.log('GET /rooms - Fetching all rooms from database');
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

  // Redis 기반 방 생성
  @Post('create')
  async createRoom(@Body() dto: CreateRoomDto) {
    try {
      this.logger.log(`POST /rooms/create - Creating Redis room: ${dto.name}`);
      this.logger.log(
        `POST /rooms/create - Request body: ${JSON.stringify(dto)}`,
      );

      // 입력 데이터 검증
      RoomValidator.validateCreateRoomData(dto);

      this.logger.log(
        `POST /rooms/create - chipType: ${dto.chipType}, seedAmount: ${dto.seedAmount}, bettingAmount: ${dto.bettingAmount}`,
      );

      const room = await this.roomService.createRoom(
        dto.name,
        dto.maxPlayers,
        dto.chipType,
        dto.seedAmount,
        dto.bettingAmount,
      );

      this.logger.log(
        `POST /rooms/create - Room created successfully: ${JSON.stringify(room)}`,
      );
      return { success: true, roomId: room.roomId, room };
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

  // Redis 기반 방 입장
  @Post('join')
  async joinRoom(@Body() dto: JoinRoomDto, @Req() req: Request) {
    try {
      let userId: string | undefined = dto.userId;
      if (
        req &&
        typeof req === 'object' &&
        'user' in req &&
        req.user &&
        typeof req.user === 'object' &&
        req.user !== null &&
        'id' in req.user &&
        typeof req.user.id === 'string'
      ) {
        userId = req.user.id;
      }
      if (!userId) {
        throw new Error('User ID is required');
      }
      this.logger.log(
        `POST /rooms/join - User ${userId} joining room: ${dto.roomId}`,
      );

      // 입력 데이터 검증
      RoomValidator.validateJoinRoomData({ roomId: dto.roomId, userId });

      const room = await this.roomService.joinRoom(dto.roomId, userId);
      return { success: true, room };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Error in POST /rooms/join - User joining room: ${dto.roomId}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Error in POST /rooms/join - User joining room: ${dto.roomId}`,
          String(error),
        );
      }
      throw error;
    }
  }

  // Redis 기반 방 목록 조회
  @Get('redis')
  async findAllRoomsInRedis() {
    try {
      this.logger.log('GET /rooms/redis - Fetching all rooms from Redis');
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
  @Get('special-cards')
  async getSpecialCards(@Query('language') language?: string): Promise<GetSpecialCardsResponseDto> {
    try {
      this.logger.log('GET /rooms/special-cards - Fetching special cards data');

      // 활성화된 스페셜카드 데이터 가져오기
      const activeSpecialCards = this.specialCardManagerService.getActiveSpecialCards();

      // 요청 언어 처리 (기본 ko)
      const lang = (language === 'id' || language === 'en' || language === 'ko') ? language : 'ko';

      const ids = activeSpecialCards.map(c => c.id);
      const dbCards = await this.prisma.specialCard.findMany({
        where: { id: { in: ids } },
        select: { id: true, description: true, descriptionKo: true, descriptionId: true, descriptionEn: true }
      });
      const idToDesc: Record<string, string> = {};
      for (const c of dbCards) {
        const ko = c.descriptionKo || c.description || '';
        const id = c.descriptionId || ko;
        const en = c.descriptionEn || ko;
        idToDesc[c.id] = lang === 'id' ? id : (lang === 'en' ? en : ko);
      }

      // SpecialCardData를 SpecialCardApiDto로 변환
      const specialCardsApi: SpecialCardApiDto[] = activeSpecialCards.map(card => ({
        id: card.id,
        name: card.name,
        description: idToDesc[card.id] ?? card.description,
        price: card.price,
        sprite: card.sprite,
        type: card.type.toString(),
        baseValue: card.baseValue || null,
        increase: card.increase || null,
        decrease: card.decrease || null,
        maxValue: card.maxValue || null,
        needCardCount: card.needCardCount || null,
        enhanceChips: card.enhanceChips || null,
        enhanceMul: card.enhanceMul || null,
        isActive: card.isActive !== false,

        // 조건-효과 시스템 필드들
        effectTimings: card.effectTimings?.map(timing => timing.toString()) || null,
        effectTypes: card.effectTypes?.map(effectType => effectType.toString()) || null,
        effectOnCards: card.effectOnCards || null,
        conditionTypes: card.conditionTypes?.map(conditionType => conditionType.toString()) || null,
        conditionValues: card.conditionValues || null,
        conditionOperators: card.conditionOperators?.map(operatorType => operatorType.toString()) || null,
        conditionNumericValues: card.conditionNumericValues || null,
      }));

      this.logger.log(`GET /rooms/special-cards - Found ${specialCardsApi.length} active special cards`);

      // 처음 5개 카드의 상세 로그 출력
      for (let i = 0; i < Math.min(5, specialCardsApi.length); i++) {
        const card = specialCardsApi[i];
        this.logger.log(`GET /rooms/special-cards - Card ${i + 1}:`, {
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
          // 조건-효과 시스템 데이터
          effectTimings: card.effectTimings,
          effectTypes: card.effectTypes,
          effectOnCards: card.effectOnCards,
          conditionTypes: card.conditionTypes,
          conditionValues: card.conditionValues,
          conditionOperators: card.conditionOperators,
          conditionNumericValues: card.conditionNumericValues
        });
      }

      const response: GetSpecialCardsResponseDto = {
        success: true,
        code: 0,
        message: 'Special cards data retrieved successfully',
        specialCards: specialCardsApi
      };

      return response;
    } catch (error: unknown) {
      this.logger.error('Error in GET /rooms/special-cards', error instanceof Error ? error.stack : String(error));

      const errorResponse: GetSpecialCardsResponseDto = {
        success: false,
        code: 1000,
        message: 'Internal server error while fetching special cards',
        specialCards: []
      };

      return errorResponse;
    }
  }

  // Redis 기반 방 삭제
  @Delete(':roomId')
  async deleteRoom(@Param('roomId') roomId: string) {
    try {
      this.logger.log(`DELETE /rooms/${roomId} - Deleting room`);
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
}
