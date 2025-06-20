"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LobbyModule = void 0;
const common_1 = require("@nestjs/common");
const lobby_service_1 = require("./lobby.service");
const lobby_controller_1 = require("./lobby.controller");
const channel_module_1 = require("../channel/channel.module");
const room_module_1 = require("../room/room.module");
let LobbyModule = class LobbyModule {
};
exports.LobbyModule = LobbyModule;
exports.LobbyModule = LobbyModule = __decorate([
    (0, common_1.Module)({
        imports: [channel_module_1.ChannelModule, room_module_1.RoomModule],
        providers: [lobby_service_1.LobbyService],
        controllers: [lobby_controller_1.LobbyController],
    })
], LobbyModule);
//# sourceMappingURL=lobby.module.js.map