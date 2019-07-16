import { 
    Deposit
 } from './models_index'

 import { ILogger, ISocketServer, IGameEngine } from '../interfaces'
 import { InversifyContainer, TYPES } from '../container'

class DepositFactory
{
    public static async GetUserLastDeposit(userId: number): Promise<Deposit | undefined> {
        return new Promise<Deposit | undefined>(async (resolve, reject) => {
            try {
                var deposit: Deposit | null = await Deposit.findOne({where: { user_id: userId }, order: [['id', 'DESC']]})
                resolve((deposit != null) ? deposit : undefined)
            } catch (e) {
                console.log(e)
                resolve(undefined)
            }
        })
    }
}

export {DepositFactory}