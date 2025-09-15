export enum TranslationKeys {
    // Auth / version
    Login = 'login',
    SaveLoginInfo = 'save_login_info',
    ClientVersionIncompatible = 'client_version_incompatible',
    AuthenticationFailed = 'authentication_failed',

    // Generic/server
    InvalidRequest = 'invalid_request',
    ServerError = 'server_error',

    // Room/user
    UserNotFound = 'user_not_found',
    NotInRoom = 'not_in_room',
    RoomNotFound = 'room_not_found',
    GameNotStarted = 'game_not_started',

    // Economy / purchases
    InsufficientFunds = 'insufficient_funds',
    InsufficientFundsForCard = 'insufficient_funds_for_card',
    InsufficientChipsForRoomEntry = 'insufficient_chips_for_room_entry',
    PurchaseFailed = 'purchase_failed',
    CardPurchaseCompleted = 'card_purchase_completed',
    CardSaleCompleted = 'card_sale_completed',
    SaleFailed = 'sale_failed',

    // Joker operations
    JokerLimitExceeded = 'joker_limit_exceeded',
    JokerAlreadyOwned = 'joker_already_owned',
    JokerNotFound = 'joker_not_found',
    JokerNotOwned = 'joker_not_owned',
    JokerCountMismatch = 'joker_count_mismatch',
    JokerOrderChanged = 'joker_order_changed',
    JokerOrderChangeFailed = 'joker_order_change_failed',
    InvalidJokerOrder = 'invalid_joker_order',

    // Discard / reroll / betting
    InvalidDiscard = 'invalid_discard',
    RerollFailed = 'reroll_failed',
    AlreadyBetting = 'already_betting',
    BettingCompleted = 'betting_completed',
    BettingFailed = 'betting_failed',

    // Cards / special cards / tarot
    InvalidCardId = 'invalid_card_id',
    CardNotOwned = 'card_not_owned',
    CardNotExists = 'card_not_exists',
    TooManyCardsSelected = 'too_many_cards_selected',
    TarotCardNotPurchased = 'tarot_card_not_purchased',
    InvalidCardCombination = 'invalid_card_combination',
    SpecialCardUseCompleted = 'special_card_use_completed',
    SpecialCardUseFailed = 'special_card_use_failed',

    // Fold / game end
    FoldShopPhaseOnly = 'fold_shop_phase_only',
    FoldPlayingStatusOnly = 'fold_playing_status_only',
    LastPlayerWins = 'last_player_wins',
    FoldCompleted = 'fold_completed',
    FoldFailed = 'fold_failed',

    // Kick out
    UnauthorizedAction = 'unauthorized_action',
    GameInProgress = 'game_in_progress',
    CannotKickSelf = 'cannot_kick_self',
    UserNotInRoom = 'user_not_in_room',
    KickOutSuccess = 'kick_out_success',
    KickOutFailed = 'kick_out_failed'
}

// TranslationKeys enum을 snake_case로 변환하는 헬퍼 함수
export function toSnakeCase(key: TranslationKeys): string {
    return key;
} 