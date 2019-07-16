import { BetType } from "../enums/BetType"
import { User } from "../database/models/User";
import { SocketClient } from "../network";

class Bet {
    constructor(public typeBet: BetType, public amount: number, public user: User, public client: SocketClient) {
    }
}

class UserBet {
    public bets: Bet[]
    constructor(public user: User) {
        this.bets = []
    }
}

export { Bet, UserBet }