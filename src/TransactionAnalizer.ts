
import Utils from "./Utils";
import { panel, text, heading, divider, copyable, Panel } from '@metamask/snaps-ui';

import { TransactionBuilder, Transaction, FeeBumpTransaction, xdr, Operation, Address, scValToNative} from "stellar-base";
import { Client } from "./Client";
import { isSorobanTransaction, assembleTransaction } from "./sorobanTxn";
import { TxnBuilder } from "./TxnBuilder";
import { Asset } from "stellar-base";
//import { toTxrep } from '@stellarguard/txrep';
/**
 * 
 * Operation.createAccount
Operation.payment
Operation.pathPaymentStrictReceive
Operation.pathPaymentStrictSend
Operation.manageSellOffer
Operation.manageBuyOffer
Operation.createPassiveSellOffer
Operation.setOptions
Operation.changeTrust
Operation.allowTrust
Operation.accountMerge
Operation.inflation
Operation.manageData
Operation.bumpSequence
Operation.createClaimableBalance
Operation.claimClaimableBalance
Operation.beginSponsoringFutureReserves
Operation.endSponsoringFutureReserves
Operation.revokeAccountSponsorship
Operation.revokeTrustlineSponsorship
Operation.revokeOfferSponsorship
Operation.revokeDataSponsorship
Operation.revokeClaimableBalanceSponsorship
Operation.revokeLiquidityPoolSponsorship
Operation.revokeSignerSponsorship
Operation.clawback
Operation.clawbackClaimableBalance
Operation.setTrustLineFlags
Operation.liquidityPoolDeposit
Operation.liquidityPoolWithdraw
 */

async function resolveAsset(){

}

async function resolveName(){

}

async function getAssetRating(client, asset){
    let network;
    try{
        if(asset.issuer === '0'){
            return `stellarexpert rating: 10`;
        }
        if(client.network === 'mainnet'){
            network = 'public';
        }
        else{
            network = client.network;
        }
        if(network === "futurenet"){
            return 'futurenet asset';
        }
        const res = await fetch(`https://api.stellar.expert/explorer/${network}/asset/${asset.code+"-"+asset.issuer}/rating`)
        let output = await res.json();
        return `stellarexpert rating: ${output.rating.average}`;
    }
    catch(e){
        console.log(e);
        return 'rating not found'
    }
}

export class TransactionAnalizer{
    client;
    constructor(client: Client){
        this.client = client;
    }

    async _buildOperationUI(operation:Operation): Promise<Array<any>>{
        let infoList = [];
        infoList.push(heading(operation.type));
        infoList.push(divider());
        console.log("build operation UI")
        for(let key in operation){
            console.log("key");
            console.log(key);
            console.log(operation[key]);
            let value = operation[key];
            if(key === 'type'){
                continue;
            }
            else if(value instanceof Asset){
                if(!value.issuer){
                    value.issuer = '0';
                }
                infoList.push(text('**'+key+'**'));
                infoList.push(text(`${value.code}`));
                infoList.push(copyable(value.issuer));
                infoList.push(text(await getAssetRating(this.client, value)))
                infoList.push(text("ㅤ"));
            }
            else if(value instanceof Uint8Array){
                let outputString = "";
                let outputBits = [];
                infoList.push(text('**'+key+'**'));
                for(let i = 0; i<value.byteLength; i++){
                    outputString += (String.fromCharCode(value[i]));
                    outputBits.push(value[i]);
                }
                infoList.push(text(outputString));
            }
            else if(key === 'path'){ 
                value = Array.from(value.map((asset)=>asset.code)).join('->')
                infoList.push(text("path"))
                infoList.push(text(value))
            }
            else if(key === 'destination'){
                infoList.push(text('destination'));
                infoList.push(copyable(value));
            }
            else{
                infoList.push(text('**'+key+'**'));
                if(typeof value === 'string'){
                    infoList.push(text(value))
                }
                else if(typeof value === "object"){
                    for(let param in value){
                        let subValue = value[param];
                        infoList.push(text("ㅤ"+param));
                        infoList.push(text("ㅤ"+String(subValue)))
                    }
                    
                }
                else{
                    infoList.push(text(String(value)));
                }
            }
            
        }
        console.log("final InfoList is");
        for(let item of infoList){
            console.log(item);
        }
        return infoList
    }

    async _parseOperation(operation, currentValue): {uiList:Array<any>, currentValue:object}{
            console.log("operation is: ");
            console.log(operation);
            const uiList = [];
            if(operation.type === 'payment'){
                uiList.push(heading('payment'))
                uiList.push(divider())
                uiList.push(text(`${operation.amount} ${operation.asset.code}`))
                uiList.push(copyable(operation.destination))
            }
            else if(operation.type === 'createAccount'){
                uiList.push(heading('createAccount'))
                uiList.push(divider())
            }
            else if(operation.type === 'invokeHostFunction'){
                uiList.push(heading('smartcontract call'));
                console.log("funcVal is: ");
                const funcVal = scValToNative(operation.func);
                console.log(funcVal);
                console.log("contract method name is: ");
                const contractAddress = Address.fromScAddress(funcVal._attributes.contractAddress).toString();
                console.log(contractAddress);
                
                uiList.push(
                    text("Contract Address"),
                    copyable(contractAddress),
                )
                //const xdrConverter = new xdr.XDRString(4294967295);
                const methodName = Array.from(funcVal._attributes.functionName);
                let methodString = '';
                for(let i = 0; i<methodName.length; i++){
                    methodString += String.fromCharCode(Number(methodName[i]));
                }
                console.log(methodString);
                uiList.push(text('Method Name'));
                uiList.push(text(methodString));
                const args = Array.from(Array.from(funcVal._attributes.args).map(scValToNative));
                uiList.push(text("Arguments"));
                for(let i = 0; i<funcVal._attributes.args.length; i++){
                    try{
                        uiList.push(text(scValToNative(funcVal._attributes.args[i]).toString()));
                    }
                    catch(e){
                        uiList.push(text("non native arg"));
                    }
                }
                console.log(args);

                console.log(operation);
            }
            else{
                uiList.push(... await this._buildOperationUI(operation));
            }
        return {uiList:[panel(uiList)], currentValue}
    }

    async decodeXDRTransaction(xdrTransaction): Promise<Transaction>{
        console.log(xdrTransaction);
        let txn = TransactionBuilder.fromXDR(xdrTransaction, this.client.currentPassphrase);
        console.log(txn);
        if('innerTransaction' in txn){
            txn = txn.innerTransaction;
        }
        if(isSorobanTransaction(txn)){
            if(this.client.network !== 'futurenet' && this.client.network !== 'testnet'){
                throw new Error("Soroban Transactions are currently only supported on futurenet and testnet");
            }
        }
        return txn;
    }

    async analizeTransaction(decodedTransaction){
        try{
            const dispArray = [heading('Sign Transaction?'), divider()];
            const network = this.client.network;
            let value = {};
            dispArray.push(text(`network: ${network}`));
            let fee = decodedTransaction._fee
            dispArray.push(text(`fee: ${fee}`));
            dispArray.push(text('operations'));
            dispArray.push(divider());
            let operations = decodedTransaction._operations
            console.log(operations);

            for(const operation of operations){
                let output = await this._parseOperation(operation, value);
                console.log(output);
                console.log("made it past parseOperation");
                dispArray.push(...output.uiList);
                dispArray.push(text("ㅤ"));
                value = output.currentValue;
            }
            for(let item of dispArray){
                console.log(item);
            }

            const confirmation = await Utils.displayPanel(panel(dispArray), "confirmation");

            return confirmation;
        }
        catch(e){
            console.log(e);
            //fallback to transaction stringify json
            const dispArray = [
                heading('Sign Transaction?'), 
                divider(), 
                panel([text(JSON.stringify((decodedTransaction)) as string)])
            ];
            const confirmation = await Utils.displayPanel(panel(dispArray));
            return confirmation;
        }
    }
}