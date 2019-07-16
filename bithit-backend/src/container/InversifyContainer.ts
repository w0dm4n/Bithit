import { Container } from 'inversify'
import { ILogger,IServiceContainer, ISocketServer,
		 IGameEngine, IMySQLConnector, IDepositHandler,
		 IWithdrawalHandler } from '../interfaces'
import { Logger } from '../logger/Logger'
import { SocketServer } from '../network'
import { GameEngine } from '../engine/GameEngine'
import { Config } from './../config'
import { ServiceContainer } from './ServiceContainer'
import { DepositHandler } from '../deposit/depositHandler'
import { MySQLConnector } from '../database/MySQLConnector'
import { WithdrawalHandler } from '../withdraw/withdrawalHandler'

export const TYPES = {
	Conf: Symbol.for('Conf'),
	Logger: Symbol.for('Logger'),
	Socket: Symbol.for('Socket'),
	ServiceContainer: Symbol.for('ServiceContainer'),
	Engine: Symbol.for('Engine'),
	MySQL: Symbol.for('MySQL'),
	DepositHandler: Symbol.for("Deposit"),
	WithdrawalHandler: Symbol.for("Withdraw"),
}

export const InversifyContainer = new Container()

export const initContainer = (conf: Config) => {
	InversifyContainer.bind<Config>(TYPES.Conf).toConstantValue(conf)
	InversifyContainer.bind<ILogger>(TYPES.Logger).to(Logger).inSingletonScope()
	InversifyContainer.bind<IMySQLConnector>(TYPES.MySQL).to(MySQLConnector).inSingletonScope()

	InversifyContainer.bind<IDepositHandler>(TYPES.DepositHandler).to(DepositHandler).inSingletonScope()
	InversifyContainer.bind<IWithdrawalHandler>(TYPES.WithdrawalHandler).to(WithdrawalHandler).inSingletonScope()
	InversifyContainer.bind<ISocketServer>(TYPES.Socket).to(SocketServer).inSingletonScope()
	InversifyContainer.bind<IGameEngine>(TYPES.Engine).to(GameEngine).inSingletonScope()
	InversifyContainer.bind<IServiceContainer>(TYPES.ServiceContainer).to(ServiceContainer).inSingletonScope()
}
