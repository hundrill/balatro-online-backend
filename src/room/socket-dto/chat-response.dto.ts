import { BaseSocketDto } from './base-socket.dto';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ChatResponseDto extends BaseSocketDto {
	override responseEventName = 'ChatResponse';

	@IsString()
	userId: string;

	@IsOptional()
	@IsString()
	nickname?: string;

	@IsString()
	text: string;

	@IsInt()
	timestamp: number;

	constructor(init?: Partial<ChatResponseDto>) {
		super();
		Object.assign(this, init);
	}
}


