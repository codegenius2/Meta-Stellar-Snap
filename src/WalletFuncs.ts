import { Account, Transaction, Keypair, xdr, Memo, MemoType, FeeBumpTransaction, Operation} from "stellar-base";
import { Client } from "./Client";
import { TxnBuilder } from "./TxnBuilder";
import { Wallet } from "./Wallet";
import Utils from "./Utils";
import { panel, text, heading, divider, copyable, Panel } from '@metamask/snaps-ui';
import { Screens } from "./screens";
import { TransactionAnalizer } from "./TransactionAnalizer";
export class WalletFuncs{
    account: Account
    keyPair: Keypair
    builder: TxnBuilder
    client: Client
    analizer: TransactionAnalizer
    constructor(account:Account, keyPair: Keypair, builder: TxnBuilder, client: Client){
        this.account = account
        this.builder = builder
        this.keyPair = keyPair
        this.client = client
        this.analizer = new TransactionAnalizer(this.client);
    }

    async transfer(to:string, amount:string){
        const txn = this.builder.buildPaymentTxn(to, amount);
        const confirmed = await Screens.paymentConfirmation(to, amount);
        if(!confirmed){
            throw Error("User rejected Request");
            return;
        }
        txn.sign(this.keyPair);
        const response = await this.client.submitTransaction(txn);
        console.log(response);
        if(response.successful){
            await Utils.notify("Transaction Successful")
        }
        else{
            await Utils.notify("Transaction Failed")
        }
        return response;
    }
    
    transferAsset(){

    }

    async signArbitaryTxn(xdrTransaction: xdr.Transaction | string): Promise<Transaction<Memo<MemoType>, Operation[]> | FeeBumpTransaction>{
        const txn = await this.analizer.decodeXDRTransaction(xdrTransaction);
        console.log(txn);
        const confirm = await this.analizer.analizeTransaction(txn);
        if(!confirm){
            throw new Error("user rejected request");
        }
        txn.sign(this.keyPair);
        console.log(txn);
        console.log("xdr is: ");
        console.log(txn.toEnvelope().toXDR());
        return txn;
    }
    
}