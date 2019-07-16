import { 
    Game
 } from './models_index'

 import { ILogger, ISocketServer, IGameEngine } from '../interfaces'
 import { InversifyContainer, TYPES } from '../container'

class GameFactory
{
    public static async InstanciateNewGame(): Promise<Game | undefined> {
        return new Promise<Game | undefined>((resolve, reject) => {
            try {
            Game.findAll({
                limit: 1,
                order: [ [ 'id', 'DESC' ]]
              }).then((entries) => {
                  if (entries.length > 0) {
                      console.log()
                    resolve(Game.create({id: entries[0].id + 1}))
                  } else {
                     resolve(Game.create({id: 1}))
                  }
              }); 
            } catch (e) {
                InversifyContainer.get<ILogger>(TYPES.Logger).error(e)
                resolve(undefined)
            }
        })
    }

    public static async HistoryLastGames(): Promise<Game[]> {
        return new Promise<Game[]>((resolve, reject) => {
           try {
            Game.findAll(
                {
                    limit: 11,
                    order: [['id', 'DESC']]
                }).then((entries) => {
                    entries.shift()
                    resolve (entries.reverse())
                });
            } catch (e) {
                InversifyContainer.get<ILogger>(TYPES.Logger).error(e)
                resolve([])
            }
        })
    }
}

export {GameFactory}