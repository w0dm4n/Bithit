
const base_url = "https://api.paybear.io/v2/";
const https = require("https");
import { Config } from '../config'
import { InversifyContainer, TYPES } from '../container'

export class PaybearProvider
{
    private conf: Config = InversifyContainer.get<Config>(TYPES.Conf)
    constructor(public secret_key: string, public public_key: string)
    { 

    }

    getHost(callback)
    {
        this.httpRequest("https://api.ipify.org/?format=json", (result) => {
            if (result != null) {
                callback(result.ip);
            } else { callback(null); }
        });
    }

    newOrder(currency, callback)
    {
        this.getHost((host) => {
            if (host) {
                let url = `http://${host}:${this.conf.httpPort}/paybear/callback`;
                let payment_url = `${base_url}${currency.toLowerCase()}/payment/${encodeURIComponent(url)}?token=${this.public_key}`;

                this.httpRequest(payment_url, (res) =>
                {
                    if (res && res.success) {
                        callback(res.data);
                    } else {
                        callback(null);
                    }
                });
            } else {
                console.error("Cant get server host, something is wrong");
            }
        });
    }

    httpRequest(url, callback)
    {
        https.get(url, res => {
            res.setEncoding("utf8");
            let body = "";
            res.on("data", data => {
              body += data;
            });
            res.on("end", () => {
                if (body.length > 0) {
                    body = JSON.parse(body);
                    callback(body);
                } else {
                    callback(null);
                }
            });
          });
    }
}