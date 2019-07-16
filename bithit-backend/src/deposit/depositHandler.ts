
import { injectable } from 'inversify'
import 'reflect-metadata'
import { InversifyContainer, TYPES } from '../container'
import { IDepositHandler, ILogger } from '../interfaces'
import { Config } from "../config"

import * as express from "express"
import { Response, Request } from "express"
import * as bodyParser from "body-parser"
import * as cors from "cors"

import {
    User,
    Deposit,
    DepositHistory,
    ReferringHistory
} from "../database/models_index"
import { DepositFactory } from "../database/DepositFactory"
import { PaybearProvider } from "../provider/PaybearProvider"

@injectable()
export class DepositHandler implements IDepositHandler {

    private conf: Config = InversifyContainer.get<Config>(TYPES.Conf)
    private log: ILogger = InversifyContainer.get<ILogger>(TYPES.Logger)
    private paybearProvider: PaybearProvider = new PaybearProvider(this.conf.privatePaybear, this.conf.publicPaybear)

    public getDiffMinutes(dt2: Date, dt1: Date): number
    {
        var diff = (dt2.getTime() - dt1.getTime()) / 1000;
        diff /= 60;
        return Math.abs(Math.round(diff));
    }

    public async getUserDeposit(req: Request, res: Response)
    {
        if (req.params.userId == null) { return res.send({error:"invalid request"})}
        const user: User | null = await User.findOne({where: { id: req.params.userId }})
        if (user == null) { return res.send({error:"invalid user id"})}

        var lastDeposit: Deposit | undefined = await DepositFactory.GetUserLastDeposit(user.id)
        if (lastDeposit == null ||
            this.getDiffMinutes(new Date(), lastDeposit.createdAt) > 60) {
            
            this.paybearProvider.newOrder("BTC", async (order) => {
                const deposit: Deposit = await Deposit.create({invoice_id: order.invoice, user_id: user.id, address: order.address})
                res.send(deposit.dataValues)
            })
            return;
        }
       
        res.send(lastDeposit.dataValues)
    }

    public async creditUser(depositHistory: DepositHistory, deposit: Deposit, user: User)
    {
        var bht_value = depositHistory.amount_deposited / this.conf.bhtPrice
        user.balance_bht += Math.floor(bht_value)

      
        user.save()
        
        this.log.info(`User ${user.email} deposit ${depositHistory.amount_deposited} BTC (${Math.floor(bht_value)} BHT), total ${user.balance_bht}`)
    }

    public async callbackPaybear(req: Request, res: Response)
    {
        try {
                if (req.body) {
                var data = req.body;
                var invoice = data.invoice;
                var amountPaid = data.inTransaction.amount / Math.pow(10, data.inTransaction.exp);
                amountPaid = (amountPaid * (100 - this.conf.feeSystemDeposit) / 100)

                const depositBase: Deposit | null = await Deposit.findOne({where: { invoice_id: invoice }})
                if (depositBase == null) {
                    this.log.info(`Something went wrong with a payment... ${invoice}, invalid deposit invoice`)
                    return
                }

                const user: User | null = await User.findOne({where:{id: depositBase.user_id}})
                if (user == null) {
                    this.log.info(`Something went wrong with a payment... ${depositBase.invoice_id}, invalid deposit user`)
                    return
                }

                var deposit: DepositHistory | null = null
                deposit = await DepositHistory.findOne({where: {invoice_id: invoice, amount_deposited: amountPaid}})
                if (deposit == null) {
                    deposit = await DepositHistory.create({amount_deposited: amountPaid,
                        invoice_id: invoice,
                        confirmation: data.confirmation,
                        status: "Pending" })
                }

                deposit.tx_hash = data.inTransaction.hash
                deposit.userId = depositBase.user_id
                if(data.confirmations >= 1) {

                    if (user.referred_by != -1) {
                        const referring: User | null = await User.findOne({where: {id: user.referred_by}})
                        if (referring != null) {
                            const win_amount = amountPaid - (amountPaid * 0.99)
                            const asBht = Math.floor(win_amount / this.conf.bhtPrice)
                            ReferringHistory.create({user_referred: user.username, user_referring: user.referred_by, amount_win: asBht, from:"deposit"})
                            referring.balance_bht += asBht
                            referring.save()

                            deposit.amount_deposited -= win_amount
                        }
                    }

                    deposit.status = "Finished"
                    deposit.confirmation = data.confirmations
                    this.log.info(`Received callback for a payment of ${deposit.amount_deposited} (${invoice}), confirmed..`)
                    this.creditUser(deposit, depositBase, user)
                    res.send(invoice); //stop further callbacks
                } else {
                    deposit.status = "Pending"
                    this.log.info(`Received callback for a payment of ${deposit.amount_deposited} (${invoice}), still waiting for confirmations..`)
                    res.send('waiting for confirmations');
                }
                deposit.save()
            } else {
                console.log("Received a bad request");
                res.send('error');
            }
        } catch (error) {
            this.log.error(`Something went wrong on a callback from paybear: ${error}`)
        }
    }

    public async InitDepositHandler()
    {
        const app = express()
        app.use(bodyParser.json())
        app.use(bodyParser.urlencoded({ extended: true }))
        app.use(cors())
        app.get("/deposit/:userId", this.getUserDeposit.bind(this))
        app.post("/paybear/callback", this.callbackPaybear.bind(this))
        const server = app.listen(this.conf.httpPort, () => {
            this.log.info(`Deposit handler listening on port ${this.conf.httpPort}`)
        });
    }
}