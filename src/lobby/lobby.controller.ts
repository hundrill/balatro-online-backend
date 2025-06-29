import { Controller, Get } from '@nestjs/common';
import { LobbyService } from './lobby.service';

@Controller('lobby')
export class LobbyController {
  constructor(private readonly lobbyService: LobbyService) {}

  @Get()
  async getLobbyInfo() {
    return this.lobbyService.getLobbyInfo();
  }
}
