import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
    constructor(private readonly userService: UserService) { }

    async register(email: string, password: string, nickname: string) {
        const passwordHash = await bcrypt.hash(password, 10);
        return this.userService.create({ email, passwordHash, nickname });
    }

    async validateUser(email: string, password: string) {
        const user = await this.userService.findByEmail(email);
        if (user && await bcrypt.compare(password, user.passwordHash)) {
            return user;
        }
        return null;
    }
} 