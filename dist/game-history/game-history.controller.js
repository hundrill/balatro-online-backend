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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameHistoryController = void 0;
const common_1 = require("@nestjs/common");
const game_history_service_1 = require("./game-history.service");
let GameHistoryController = class GameHistoryController {
    gameHistoryService;
    constructor(gameHistoryService) {
        this.gameHistoryService = gameHistoryService;
    }
    async findAll() {
        return this.gameHistoryService.findAll();
    }
    async create(roomId, startedAt, endedAt) {
        return this.gameHistoryService.create({
            roomId,
            startedAt: new Date(startedAt),
            endedAt: endedAt ? new Date(endedAt) : undefined,
        });
    }
};
exports.GameHistoryController = GameHistoryController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GameHistoryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)('roomId')),
    __param(1, (0, common_1.Body)('startedAt')),
    __param(2, (0, common_1.Body)('endedAt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String]),
    __metadata("design:returntype", Promise)
], GameHistoryController.prototype, "create", null);
exports.GameHistoryController = GameHistoryController = __decorate([
    (0, common_1.Controller)('game-history'),
    __metadata("design:paramtypes", [game_history_service_1.GameHistoryService])
], GameHistoryController);
//# sourceMappingURL=game-history.controller.js.map