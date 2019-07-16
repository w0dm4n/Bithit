import { inject, injectable } from 'inversify'
import 'reflect-metadata'
import * as io from 'socket.io'

import { Config } from '../config'
import { ILogger, ISocketServer, IGameEngine } from '../interfaces'

import { InversifyContainer, TYPES } from '../container'
import { SocketClient } from '../network'

@injectable()
class SocketServer implements ISocketServer {

	private conf: Config = InversifyContainer.get<Config>(TYPES.Conf)
	private log: ILogger = InversifyContainer.get<ILogger>(TYPES.Logger)
	private server: io.Server

	private clients: SocketClient[] = []
	public engine: IGameEngine
	public listenEvents() {
		this.server.on('connection', (sock) => {
			this.onClientConnection(sock)
		})
	}

	public onClientConnection(sock: io.Socket) {
		try {
			const client = new SocketClient(sock, this)

			this.log.info(`New client connected from ${client.GetRemoteIpAddress()}`)
			this.clients.push(client)
		} catch (error) {
			this.log.error(`Can't handle new connection: ${error}`)
		}
	}

	public onClientDisconnection(client: SocketClient) {
		try {
			this.log.info(`Client ${client.GetRemoteIpAddress()} disconnected `)
			this.clients.splice(this.clients.indexOf(client), 1)
		} catch (error) {
			this.log.error(`Can't handle disconnection: ${error}`)
		}
	}

	public InitServer(engine: IGameEngine)  {
		this.engine = engine
		this.server = io({
			path: this.conf.socketBasePath,
			pingInterval: this.conf.intervalSocketPing,
			pingTimeout: this.conf.timeoutSocketPing,
		})

		try {
			this.log.info(`Starting socket server on port ${this.conf.socketPort}`)
			this.server.listen(this.conf.socketPort)
			this.listenEvents()
		} catch (error) {
			throw error
		}
	}

	public GetGuestClients(): SocketClient[] {
		return this.clients.filter((x) => x.clientInfos.guest === true)
	}

	public GetClients() : SocketClient[] {
		return this.clients
	}

	public GetClientByUserId(id: number): SocketClient | undefined {
		var res: SocketClient[] = this.clients.filter((x) => x.clientInfos.user != null &&
			 x.clientInfos.user.id == id)
		return (res.length > 0) ? res[0] : undefined
	}

	public GetClientByUserName(username: string) : SocketClient | undefined {
		var res: SocketClient[] = this.clients.filter((x) => x.clientInfos.user != null &&
		x.clientInfos.user.username == username)
   		return (res.length > 0) ? res[0] : undefined
	}

	public GetServer(): io.Server {
		return this.server
	}

}

export { SocketServer }
