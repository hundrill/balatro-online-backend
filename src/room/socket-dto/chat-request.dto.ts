import { BaseSocketDto } from './base-socket.dto';
import { IsString } from 'class-validator';

export class ChatRequestDto extends BaseSocketDto {
	static readonly requestEventName = 'ChatRequest';

	@IsString()
	text: string;
}


