import { injectable } from 'inversify'
import 'reflect-metadata'
import { ILogger, ISocketServer, IGameEngine } from '../interfaces'
import { InversifyContainer, TYPES } from '../container'
import { 
	Game,
	User
 } from '../database/models_index'
import { Config } from '../config'
import * as crypto from 'crypto'
import * as seedrandom from 'seedrandom'
import { GameFactory } from "../database//GameFactory"
import { Bet, UserBet } from "../objects/Bet"
import { BetType } from "../enums/BetType"
import { SocketClient } from '../network/SocketClient';
import { throws } from 'assert';

@injectable()
class GameEngine implements IGameEngine {
	private log: ILogger = InversifyContainer.get<ILogger>(TYPES.Logger)
	private sockServer: ISocketServer = InversifyContainer.get<ISocketServer>(TYPES.Socket)
	private conf: Config = InversifyContainer.get<Config>(TYPES.Conf)

	private currentPlayedGame: Game | undefined
	private playing: true
	private lastGameHash: string | undefined
	private lastGameId: number | undefined
	private chatHistory: any[]
	private betHistory: any[]

	public async Init() {
		this.betHistory = []
		this.chatHistory = []
		this.lastGameHash = undefined
		this.sockServer.InitServer(this)

		this.log.info("Starting game engine...")

		const users: User[] | null = await User.findAll({where: {locked: true}})
		if (users != null) {
			users.forEach(element => {
				element.locked = false
				element.save()
			});
		}
		this.loopEngine()
		setInterval(() => {
			this.sendGlobalsData()
		}, (this.conf.timeGlobalData * 1000))
	}

	public sendGlobalsData() 
	{
		var clientsLength = this.sockServer.GetClients().length

		this.SendUsers({type:"global", players: clientsLength, last_hash: this.lastGameHash,
		round: this.lastGameId})
	}

	public async EventClientConnected(client: SocketClient) {
		try {
			const lastGames: Game[] = await GameFactory.HistoryLastGames()

			client.SendMessage({type:"history", messages:
			{
				games: lastGames,
				chat_history: this.chatHistory,
				bet_history: this.betHistory
			}})

			this.sendGlobalsData()

			if (this.currentPlayedGame !== undefined) {
				var a: any = this.currentPlayedGame.timeEnd;
				var now: any = new Date();
				var difference = (a - now) / 1000;

				client.SendMessage({type:"new_game", timeleft: difference.toFixed(0)})
				this.currentPlayedGame.bets.forEach((bet) => {
					this.SendBetData(bet, client)
				})
			}
		} catch (error) {
			this.log.error(error)
		}
	}
 
	public getHash(game): string
	{
		var hash = crypto.createHmac('sha512', this.conf.baseSeed);
		hash.update(JSON.stringify(game));
		return hash.digest('hex');
	}

	public async loopEngine()
	{
		this.newGame()
	}

	public getGameResult(): BetType {
		if (this.currentPlayedGame === undefined) return BetType.NONE;
		if (this.currentPlayedGame.result == 0) {
			return BetType.GREEN
		} else if (this.currentPlayedGame.result <= 7) {
			return BetType.RED
		} else {
			return BetType.BLACK
		}
	}

	public onWinBet(bet: Bet): number
	{
		if (bet.typeBet == BetType.GREEN) {
			return bet.amount * 7
		}
		return bet.amount * 2
	}

	public updateForUserOnline(user: User)
	{
		this.sockServer.GetClients().forEach(client => {
			try {
				if (client.clientInfos.user != null && 
					client.clientInfos.user.id == user.id) {
					client.clientInfos.user = user
				}
			} catch (error) {
				this.log.error(error)
			}
		});
	}

	public addInBetHistory(betHistory: any)
	{
		if (this.betHistory.length >= 100) {
			this.betHistory = this.betHistory.slice(this.betHistory.length - 50, this.betHistory.length)
		}
		this.betHistory.push(betHistory)
	}

	public async endGame()
	{
		if (this.currentPlayedGame === undefined) { this.newGame(); return; }

		this.currentPlayedGame.canBet = false
		this.lastGameHash = this.currentPlayedGame.game_hash
		this.lastGameId = this.currentPlayedGame.id
		var gameResult : BetType = this.getGameResult()
		this.log.info(`Game result: ${Object.values(BetType)[(gameResult - 1)]} (${this.currentPlayedGame.result})`)

		var usersBets: UserBet[] = []
		var totalPlayed: number = 0

		this.currentPlayedGame.bets.forEach((bet) => {
			var userBet = usersBets.filter((u) => u.user.id == bet.user.id)[0]
			if (userBet != null) {
				userBet.bets.push(bet)
			} else {
				var userBet = new UserBet(bet.user)
				userBet.bets.push(bet)
				usersBets.push(userBet)
			}
		})

		var betResults: any = []
		usersBets.forEach((x) => {
			var result: number = 0
			x.bets.forEach((b) => {
				totalPlayed += b.amount
				result = result - b.amount
				if (b.typeBet == gameResult) {
					result += this.onWinBet(b)
				}
			})
			if (result > 0) {
				x.user.balance_bht += result
				this.log.info(`User ${x.user.email} won ${result}, total ${x.user.balance_bht}`)
			} else {
				x.user.balance_bht = x.user.balance_bht + result
				this.log.info(`User ${x.user.email} lost ${result}, total left ${x.user.balance_bht}`)
			}
			var history: any = {username: x.user.username, amount: result}

			this.addInBetHistory(history)
			betResults.push(history)
			if (x.user.balance_bht < 0) {
				x.user.balance_bht = 0
			}
			x.user.locked = false;
			x.user.save()
			this.updateForUserOnline(x.user)
		})

		this.SendUsers({type:"end_game", hash: this.currentPlayedGame.game_hash, 
		total_played: totalPlayed, result: this.currentPlayedGame.result,
		round_number: this.currentPlayedGame.id, indice: this.currentPlayedGame.indice,
		bet_results: betResults})
		
		this.currentPlayedGame = undefined;

		setTimeout(() => {
			this.newGame()
		}, (this.conf.timeBetweenEachGame * 1000))
	}

	public async newGame()
	{
		
		var game: Game | undefined = await GameFactory.InstanciateNewGame()
		if (game !== undefined) {
			game.canBet = true
			game.bets = [];
			const hashFrom: any = {lastHash: (this.lastGameHash !== undefined) ? 
				this.lastGameHash : null, game: game.dataValues}
			game.game_hash = this.getHash(JSON.stringify(hashFrom))
			var rng = seedrandom(game.game_hash)
			game.result = Math.round(rng.quick() * 14)
			game.indice = rng.quick().toPrecision(2)

			this.log.info(`New game id ${game.id} instancied.. Roll is ${game.result} (${game.game_hash})`)
			this.currentPlayedGame = game;
			await game.save()
			game.timeEnd = new Date(new Date().getTime() + (1000 * this.conf.timeGame))

			this.sockServer.GetClients().forEach((client) => {
				if (client.clientInfos.user == null) return;
				client.SendMessage({type: "balance", amount: client.clientInfos.user.balance_bht});
			});
			this.SendUsers({type:"new_game", timeleft: this.conf.timeGame})
			setTimeout(() => this.endGame(), (this.conf.timeGame * 1000))
		}
	}

	public GetTotalGameBetByUser(userId: number): number
	{
		var totalBet: number = 0
		if (this.currentPlayedGame === undefined) return totalBet
		this.currentPlayedGame.bets.forEach((bet) => {
			if (bet.user.id == userId) {
				totalBet += bet.amount
			}
		})
		return totalBet
	}

	public SendUsers(data) {
		this.sockServer.GetClients().forEach((client) => {
			try {
			client.SendMessage(data)
			} catch (error) {
				this.log.error(error)
			}
		})
	}

	public TotalUserBetPerType(user: User, type: BetType): number
	{
		var totalAmount: number = 0
		if (this.currentPlayedGame === undefined) return totalAmount
		this.currentPlayedGame.bets.forEach((b) => {
			if (b.typeBet == type &&
				b.user.id == user.id) {
				totalAmount += b.amount
			}
		})
		return totalAmount
	}

	public SendBetData(bet: Bet, singleUser: SocketClient | undefined)
	{
		var totalAmount : number = this.TotalUserBetPerType(bet.user, bet.typeBet)

		if (singleUser !== undefined) {
			if (singleUser.clientInfos.user != null &&
				singleUser.clientInfos.user.id == bet.user.id) {
				singleUser.SendMessage({type:"bet", bet:{amount: totalAmount, type: bet.typeBet}, user: bet.user.username, me: true})
			} else {
				singleUser.SendMessage({type:"bet", bet:{amount: totalAmount, type: bet.typeBet}, user: bet.user.username, me: false})
			}
			return;
		}

		this.sockServer.GetClients().forEach((client) => {
			try {
				if (client.clientInfos.user != null && client.clientInfos.user.id == bet.user.id) {
					client.SendMessage({type:"bet", bet:{amount: totalAmount, type: bet.typeBet}, user: bet.user.username, me: true})
				} else {
					client.SendMessage({type:"bet", bet:{amount: totalAmount, type: bet.typeBet}, user: bet.user.username, me: false})
				}
			} catch (error) {
				this.log.error(error)
			}
		})
	}
	
	public async PlaceBet(bet: Bet) {
		var client = this.sockServer.GetClientByUserId(bet.user.id)
		if (client != null && this.currentPlayedGame !== undefined
			&& client.clientInfos.user != null && this.currentPlayedGame.canBet) {
			client.clientInfos.user.locked = true;
			await client.clientInfos.user.save()
			var amountAlreadyBet: number = this.GetTotalGameBetByUser(bet.user.id)
			var total = bet.amount + amountAlreadyBet

			if (total <= client.clientInfos.user.balance_bht) {
				this.currentPlayedGame.bets.push(bet)
				this.log.info(`User ${client.clientInfos.user.email} added ${bet.amount} BHT to ${Object.values(BetType)[(bet.typeBet - 1)]}`)
				this.SendBetData(bet, undefined)
			} else {
				console.log(`User ${client.clientInfos.user.email}, amount bet: ${bet.amount}, already in bet ${amountAlreadyBet}: ${total} <= ${client.clientInfos.user.balance_bht}`)
				client.SendMessage({type:"betError", errorId: 1})
			}
		}
	}

	public handleAdminCommand(client: SocketClient, message: string)
	{
		var datas = message.split(" ");
		var target: SocketClient | undefined = undefined
		switch(datas[0])
		{
			case "!mute":
				target = this.sockServer.GetClientByUserName(datas[1])
				if (target === undefined || target.clientInfos.user == null) {
					client.SendMessage({type: "chat", msg: `Can't find user ${datas[1]}`, user: "Server"})
					return;
				}
				target.clientInfos.user.muted = true;
				target.clientInfos.user.save()
			break;

			case "!unmute":
				target = this.sockServer.GetClientByUserName(datas[1])
				if (target === undefined || target.clientInfos.user == null) {
					client.SendMessage({type: "chat", msg: `Can't find user ${datas[1]}`, user: "Server"})
					return;
				}
				target.clientInfos.user.muted = false;
				target.clientInfos.user.save()
			break;
		}
	}

	public UserChatMessage(client: SocketClient, message: string) {
		if (client.clientInfos.user == null || message.length == 0 ||
				 message.length > 500) {
			return
		}

		if (client.clientInfos.user.muted) {
			client.SendMessage({type: "chat", msg: `You are muted, you can't talk on the chat !`, user: "Server"} )
			return
		}
		
		if (message[0] == "!" &&
			client.clientInfos.user.admin) {
			this.handleAdminCommand(client, message)
			return;
		}
		var obj = {type: "chat", msg: message, user: client.clientInfos.user.username} 
		this.chatHistory.push(obj)
		this.SendUsers(obj)

		if (this.chatHistory.length >= 200)	 {
			this.chatHistory = this.chatHistory.slice(this.chatHistory.length - 100, this.chatHistory.length)

		}
	}

	public GetCurrentGameUserBet(userId: number): Bet[] | undefined {
		if (this.currentPlayedGame === undefined) {
			return undefined
		}
		return this.currentPlayedGame.bets.filter(x => x.user.id == userId)
	}
}

export { GameEngine }
