"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LobbyService = void 0;
const common_1 = require("@nestjs/common");
const channel_service_1 = require("../channel/channel.service");
const room_service_1 = require("../room/room.service");
let LobbyService = class LobbyService {
    channelService;
    roomService;
    constructor(channelService, roomService) {
        this.channelService = channelService;
        this.roomService = roomService;
    }
    async getLobbyInfo() {
        const channels = await this.channelService.findAll();
        const rooms = await this.roomService.findAll();
        return { channels, rooms };
    }
};
exports.LobbyService = LobbyService;
exports.LobbyService = LobbyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [channel_service_1.ChannelService,
        room_service_1.RoomService])
], LobbyService);
//# sourceMappingURL=lobby.service.js.map