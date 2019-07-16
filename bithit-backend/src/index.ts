import { initContainer, InversifyContainer, TYPES } from './container'

import * as winston from 'winston'
import { Config, loadConfigFromEnv } from './config'
import { ILogger, IServiceContainer } from './interfaces'

process.on('uncaughtException', (err) => {
	InversifyContainer.get<ILogger>(TYPES.Logger).info(`Uncaught exception: ${err}`)
})

const start = async () => {
	const logger = winston.createLogger({
		level: 'info',
		format: winston.format.json(),
		transports: [
			new winston.transports.Console(),
		],
	})
	try {
		const config = loadConfigFromEnv()
		initContainer(config)

		const log = InversifyContainer.get<ILogger>(TYPES.Logger)
		log.InitLogger('Bithit engine')

		log.info('Initializing Bithit engine')

		InversifyContainer.get<IServiceContainer>(TYPES.ServiceContainer).Start()
	} catch (error) {
		logger.error({ message: error.message, stack: JSON.stringify(error) })
		process.exit(1)
	}
}

(() => start())()
