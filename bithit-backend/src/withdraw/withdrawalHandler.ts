
import { injectable } from 'inversify'
import 'reflect-metadata'
import { InversifyContainer, TYPES } from '../container'
import { IWithdrawalHandler, ILogger } from '../interfaces'
import { Config } from '../config'
import { Withdraw, User } from '../database/models_index'

import { WithdrawState } from '../enums/WithdrawState'
import * as request from 'request-promise'

@injectable()
export class WithdrawalHandler implements IWithdrawalHandler {
    private conf: Config = InversifyContainer.get<Config>(TYPES.Conf)
    private log: ILogger = InversifyContainer.get<ILogger>(TYPES.Logger)
    public async InitWithdrawalHandler() {
        setInterval(async () => this.checkValidatedWithdraw(), (this.conf.timeCheckWithdraw * 1000))
    }

    public cancelWithdraw(withdraw: Withdraw, user: User): boolean {
        withdraw.state = WithdrawState.CANCELLED
        withdraw.save()

        user.balance_bht += withdraw.amount
        user.save()
        return true   
    }

    public async checkValidatedWithdraw()
    {
        const withdraws: Withdraw[] | undefined = await Withdraw.findAll({where: {state: WithdrawState.VALIDATED}})
        if (withdraws === undefined) { return }

        withdraws.forEach(async element => {
            const user: User | null = await User.findOne({where:{id: element.user_id}})
            if (user == null) return;

            try {
                const withFees = element.amount - this.conf.feeSystemWithdraw
                const btc_amount: number = withFees * this.conf.bhtPrice
                const satoshi_amount = btc_amount / this.conf.satoshiPrice
                const path = `${this.conf.blockchainUrl}/merchant/${this.conf.blockchainGuid}/payment?password=${this.conf.blockchainPassword}&to=${element.address}&amount=${satoshi_amount}&from=0`

                const res = await request({
                    uri: path,
                    json: true})

                if (res.success != true) {
                    this.log.error(`Error occured on withdrawal request, cancelling it`)
                    return this.cancelWithdraw(element, user);
                }
                element.tx_hash = res.txid
                element.state = WithdrawState.FINISHED
                element.save()

                console.log(`New withdrawal of ${withFees} BHT - ${btc_amount} BTC - ${satoshi_amount} Satoshi made with success (${element.tx_hash})`)
            } catch (error) {
                this.log.error(`Error on withdrawal: ${error}`)
                this.cancelWithdraw(element, user)
            }
        });
    }
}