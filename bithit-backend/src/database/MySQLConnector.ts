import { inject, injectable } from 'inversify'
import 'reflect-metadata'
import { InversifyContainer, TYPES } from '../container/InversifyContainer'

import { Config } from '../config'
import { ILogger, IServiceContainer, IGameEngine, IMySQLConnector } from '../interfaces'

import { Sequelize } from 'sequelize-typescript';

@injectable()
class MySQLConnector implements IMySQLConnector {

	private log: ILogger = InversifyContainer.get<ILogger>(TYPES.Logger)
    private conf: Config = InversifyContainer.get<Config>(TYPES.Conf)

	public async Init() {
        const sequelize =  new Sequelize({
            database: this.conf.mysqlDatabase,
            dialect: 'mysql',
            host: this.conf.mysqlHost,
            username: this.conf.mysqlUser,
            password: this.conf.mysqlPassword,
            storage: ':memory:',
            modelPaths: [__dirname + '/models'],
            operatorsAliases: false,
            logging: false
        });
        sequelize.authenticate()
    }
    
}

export { MySQLConnector }
