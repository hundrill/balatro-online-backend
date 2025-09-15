import { Controller, Get, Param, Request, UseGuards, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PiggyBankResponseDto } from './dto/piggybank-response.dto';
import { PiggyBankClaimRequestDto } from './dto/piggybank-claim-request.dto';
import { PiggyBankClaimResponseDto } from './dto/piggybank-claim-response.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get()
  async findAll() {
    return this.userService.findAll();
  }

  @Get('piggybank')
  @UseGuards(JwtAuthGuard)
  async getPiggyBank(@Request() req: any): Promise<PiggyBankResponseDto> {
    const userId = req.user.userId;
    return this.userService.getPiggyBank(userId);
  }

  @Post('piggybank/claim')
  @UseGuards(JwtAuthGuard)
  async claimPiggyBank(@Request() req: any, @Body() claimRequest: PiggyBankClaimRequestDto): Promise<PiggyBankClaimResponseDto> {
    const userId = req.user.userId;
    return this.userService.claimPiggyBank(userId, claimRequest);
  }
}
