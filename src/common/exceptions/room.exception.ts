import { HttpException, HttpStatus } from '@nestjs/common';

export class RoomNotFoundException extends HttpException {
  constructor(roomId: string) {
    super(`Room not found: ${roomId}`, HttpStatus.NOT_FOUND);
  }
}

export class RoomFullException extends HttpException {
  constructor(roomId: string) {
    super(`Room is full: ${roomId}`, HttpStatus.BAD_REQUEST);
  }
}

export class UserAlreadyInRoomException extends HttpException {
  constructor(userId: string, roomId: string) {
    super(
      `User ${userId} is already in room ${roomId}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class UserNotInRoomException extends HttpException {
  constructor(userId: string, roomId: string) {
    super(`User ${userId} is not in room ${roomId}`, HttpStatus.BAD_REQUEST);
  }
}

export class RedisConnectionException extends HttpException {
  constructor(message: string) {
    super(
      `Redis connection error: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
