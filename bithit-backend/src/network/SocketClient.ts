import * as io from 'socket.io'

import { InversifyContainer, TYPES } from '../container'
import { ClientInfos, ILogger, ISocketClient } from '../interfaces'
import { SocketServer } from './SocketServer'
import { User } from "../database/models_index"

import { BetType } from "../enums/BetType"
import { Bet } from '../objects/Bet';

class SocketClient implements ISocketClient {
	public clientInfos: ClientInfos

	private log: ILogger = InversifyContainer.get<ILogger>(TYPES.Logger)

	constructor(public sock: io.Socket, public server: SocketServer) {
		this.clientInfos = {
			guest: true,
			user: null
		}

		this.listenEvents()
		this.server.engine.EventClientConnected(this);
	}

	public listenEvents() {
		const events = [{
			action: this.onClientRegister.bind(this),
			type: 'register',
		},
		{
			action: this.onClientBet.bind(this),
			type: 'bet',
		},
		{
			action: this.onClientChatMessage.bind(this),
			type: 'chat_message',
		}]

		events.map((e) => {
			this.sock.on(e.type, (d) => {
				try {
					e.action(JSON.parse(d))
				} catch (ex) {
					this.log.error(`Can't handle the message ${ex}`)
				}
			})
		})

		this.sock.on('disconnect', () => {
			this.server.onClientDisconnection(this)
		})
	}

	public SendMessage(data: object) {
		try {
			const dataRaw: string = JSON.stringify(data)
		/* 	this.log.debug(`Sending ${dataRaw} to client` +
				` on ${this.GetRemoteIpAddress()})`) */
			this.sock.emit('data', dataRaw)
		} catch (error) {
			this.log.error(`Can't sent message to client` +
				` on ${this.GetRemoteIpAddress()} due to error: ${error}`)
		}
	}

	public GetRemoteIpAddress(): string {
		if (this.sock.handshake.headers['x-forwarded-for'] != null) {
			let header: string = this.sock.handshake.headers['x-forwarded-for']
			if (header.indexOf(',') !== -1) {
				header = header.split(',')[0]
			}
			return header
		} else {
			return this.sock.request.connection.remoteAddress
		}
	}

	public async onClientBet(data)
	{
		if (this.clientInfos.user == null || data.betType == null || data.amount == null) return;
		if (data.amount <= 0 || data.amount > 1000000) return;
		this.clientInfos.user = await User.findOne({where: { id: this.clientInfos.user.id }})
		if (this.clientInfos.user == null) return;
		
		if (Object.values(BetType).includes(data.betType) && 
			this.clientInfos.user.balance_bht >= data.amount) {
			this.server.engine.PlaceBet(new Bet(data.betType, data.amount, this.clientInfos.user, this))
		}
	}

	public UpdateUserObject(user: User)
	{
		this.clientInfos.user = user
	}

	public async onClientChatMessage(data)
	{
		if (this.clientInfos.user == null || data.msg == null) return;
		this.server.engine.UserChatMessage(this, data.msg)
	}

	public async onClientRegister(data) {
		if (data.session == null) return;

		this.clientInfos.user = await User.findOne({where: { last_session: data.session }})
		this.clientInfos.guest = (this.clientInfos.user != null)
		if (this.clientInfos.user != null) {
			this.log.info(`User ${this.clientInfos.user.email}:${data.session} joined the server`)
			var bets: Bet[] | undefined = this.server.engine.GetCurrentGameUserBet(this.clientInfos.user.id)
			if (bets !== undefined) {
				bets.forEach(x => {
					if (this.clientInfos.user != null)
						this.clientInfos.user.balance_bht -= x.amount
				})
			}

			this.SendMessage({type:"login", logged: true})
			this.SendMessage({type:"balance", amount: this.clientInfos.user.balance_bht})
		} else {
			this.SendMessage({type:"login", logged: false})
		}
	}
}
export { SocketClient }
