import { inject, injectable } from 'inversify'
import 'reflect-metadata'
import { InversifyContainer } from './InversifyContainer'

import { Config } from '../config'
import { ILogger, IServiceContainer, IGameEngine, 
		IMySQLConnector, IDepositHandler, IWithdrawalHandler } from '../interfaces'

import { TYPES } from './InversifyContainer'

@injectable()
class ServiceContainer implements IServiceContainer {

	public started: boolean
	private log: ILogger = InversifyContainer.get<ILogger>(TYPES.Logger)
	private conf: Config = InversifyContainer.get<Config>(TYPES.Conf)

	public async Start() {
		this.started = true
		this.log.info('Service started successfully')

		InversifyContainer.get<IMySQLConnector>(TYPES.MySQL).Init()
		InversifyContainer.get<IGameEngine>(TYPES.Engine).Init()
		InversifyContainer.get<IDepositHandler>(TYPES.DepositHandler).InitDepositHandler()
		InversifyContainer.get<IWithdrawalHandler>(TYPES.WithdrawalHandler).InitWithdrawalHandler()
	}
}

export { ServiceContainer }
