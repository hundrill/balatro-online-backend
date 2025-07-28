import { BaseSocketDto } from './base-socket.dto';

export class StartGameRequestDto extends BaseSocketDto {
    static readonly eventNameRequest = 'StartGameRequest';
}
