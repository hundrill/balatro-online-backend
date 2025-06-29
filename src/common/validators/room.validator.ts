import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class RoomValidator {
    static validateRoomName(name: string): void {
        if (!name || typeof name !== 'string') {
            throw new BadRequestException('Room name is required and must be a string');
        }

        if (name.length < 1 || name.length > 50) {
            throw new BadRequestException('Room name must be between 1 and 50 characters');
        }

        // 특수문자 제한
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(name)) {
            throw new BadRequestException('Room name contains invalid characters');
        }
    }

    static validateMaxPlayers(maxPlayers: number): void {
        if (!maxPlayers || typeof maxPlayers !== 'number') {
            throw new BadRequestException('Max players is required and must be a number');
        }

        if (maxPlayers < 2 || maxPlayers > 8) {
            throw new BadRequestException('Max players must be between 2 and 8');
        }
    }

    static validateRoomId(roomId: string): void {
        if (!roomId || typeof roomId !== 'string') {
            throw new BadRequestException('Room ID is required and must be a string');
        }

        // UUID 형식 검증
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(roomId)) {
            throw new BadRequestException('Invalid room ID format');
        }
    }

    static validateUserId(userId: string): void {
        if (!userId || typeof userId !== 'string') {
            throw new BadRequestException('User ID is required and must be a string');
        }

        if (userId.length < 1 || userId.length > 100) {
            throw new BadRequestException('User ID must be between 1 and 100 characters');
        }
    }

    static validateCreateRoomData(data: { name: string; maxPlayers: number }): void {
        this.validateRoomName(data.name);
        this.validateMaxPlayers(data.maxPlayers);
    }

    static validateJoinRoomData(data: { roomId: string; userId?: string }): void {
        this.validateRoomId(data.roomId);
        if (data.userId) {
            this.validateUserId(data.userId);
        }
    }
} 