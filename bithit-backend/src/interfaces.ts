import * as io from 'socket.io'
import { SocketClient } from './network'
import {User} from "./database/models_index"
import {Bet} from "./objects/Bet"

export type ClientInfos = {
	guest: boolean
	user: User | null
}

export interface ILogger {
	name: string
	version: string
	level: string

	info: any
	error: any
	warn: any
	debug: any

	InitLogger(name: string)
}

export interface IServiceContainer {
	Start()
}

export interface ISocketClient {
	clientInfos: ClientInfos
	SendMessage(data: object)
	GetRemoteIpAddress(): string
	UpdateUserObject(user: User)
}

export interface ISocketServer {
	InitServer(engine: IGameEngine)
	GetServer(): io.Server
	GetGuestClients(): SocketClient[]
	GetClientByUserId(id: number): SocketClient | undefined
	GetClients() : SocketClient[]
	GetClientByUserName(username: string) : SocketClient | undefined 

}

export interface IGameEngine {
	Init()
	PlaceBet(bet: Bet)
	EventClientConnected(client: SocketClient)
	UserChatMessage(client: SocketClient, message: string)
	GetCurrentGameUserBet(userId: number): Bet[] | undefined 
}

export interface IMySQLConnector {
	Init()
}

export interface IDepositHandler {
	InitDepositHandler()
}

export interface IWithdrawalHandler {
	InitWithdrawalHandler()
}