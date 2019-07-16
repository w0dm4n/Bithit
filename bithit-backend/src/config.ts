import { ENV, loadConfig } from 'config-decorators'
import * as dotenv from 'dotenv'
import 'reflect-metadata'

export class Config {
	@ENV('ENVIRONMENT', true)
	public environment: string
	@ENV('LOG_LEVEL', true)
	public logLevel: string
	@ENV('LOG_VERSION', true)
	public logVersion: string
	@ENV('BASE_PATH_SOCKET', true)
	public socketBasePath: string
	@ENV('PORT_SOCKET', true)
	public socketPort: string
	@ENV('PING_TIMEOUT_SOCKET', true)
	public intervalSocketPing: string
	@ENV('PING_TIMEOUT_SOCKET', true)
	public timeoutSocketPing: string
	@ENV('MYSQL_HOST', true)
	public mysqlHost: string
	@ENV('MYSQL_USER', true)
	public mysqlUser: string
	@ENV('MYSQL_PASSWORD', true)
	public mysqlPassword: string
	@ENV('MYSQL_DATABASE', true)
	public mysqlDatabase: string
	@ENV('BASE_SEED', true)
	public baseSeed: string
	@ENV('TIME_GAME', true)
	public timeGame: number
	@ENV('TIME_BETWEEN_EACH_GAME', true)
	public timeBetweenEachGame: number
	@ENV('TIME_GLOBAL_DATA', true)
	public timeGlobalData: number
	@ENV('HTTP_PORT', true)
	public httpPort: number
	@ENV('PUBLIC_PAYBEAR', true)
	public publicPaybear: string
	@ENV('PRIVATE_PAYBEAR', true)
	public privatePaybear: string
	@ENV('BHT_PRICE', true)
	public bhtPrice: number
	@ENV('TIME_CHECK_WITHDRAW', true)
	public timeCheckWithdraw: number
	@ENV('SATOSHI_PRICE', true)
	public satoshiPrice: number
	@ENV('BLOCKCHAIN_GUID', true)
	public blockchainGuid: string
	@ENV('BLOCKCHAIN_PASSWORD', true)
	public blockchainPassword: string
	@ENV('BLOCKCHAIN_URL', true)
	public blockchainUrl: string
	@ENV('FEE_SYSTEM_DEPOSIT', true)
	public feeSystemDeposit: number
	@ENV('FEE_SYSTEM_WITHDRAW', true)
	public feeSystemWithdraw: number
}

export const loadConfigFromEnv = (): Config => {
	const result = dotenv.config()
	const config = loadConfig(Config)
	return config
}
