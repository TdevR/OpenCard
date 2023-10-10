const sha256=require("sha256");
const { v1: uuidV1 } = require('uuid');
const currentNodeUrl=process.argv[3];
class   Blockchain {
    constructor() {
        this.chain = [];
        this.newTransaction = [];
        this.currentNodeUrl=currentNodeUrl;
        this.networkNodes=[];
        this.createNewBlock(100,"0","0");
    }
    createNewBlock(nonce, previousBlockHash, hash) {
        const newBlock = {
            index: this.chain.length + 1,
            timestamp: Date.now(),
            transactions: this.newTransaction,
            hash: hash,
            nonce: nonce,
            previousBlockHash: previousBlockHash
        };
        this.newTransaction = [];
        this.chain.push(newBlock);
        return newBlock;
    }
    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }
    createTransaction (amount,sender,receiver) {
        const pending ={amount:amount,sender:sender,receiver:receiver,transactionId:uuidV1().split('-').join('')};
        return pending;
    }
    addTransactionToPendingTransaction(pending){
        this.newTransaction.push(pending);
        return (this.getLastBlock()["index"]) + 1;

    }
    isChainValid(blockchain){
        let chainIsValid=true;
        for(let i=1;i<blockchain.length;i++){
            let currentBlock=blockchain[i];
            let previousBlock=blockchain[i-1];
            const hashIsCorrect=currentBlock.previousBlockHash===previousBlock.hash;
            const hashValue=this.hashing(previousBlock.hash,{transactions:currentBlock.transactions},currentBlock.nonce);
            console.log(hashValue);
            if(hashValue.substring(0,4)!='0000'){
                chainIsValid=false
            }
            if(!hashIsCorrect)chainIsValid=false;
        }
        const genBlock=blockchain[0];
        const amountVerify=genBlock['nonce']===100;
        const previousVerify=genBlock['previousBlockHash']==='0';
    const hashVerify=genBlock['hash']==='0';
        const correctTransactions = genBlock['transactions'].length === 0;
        if(!amountVerify || !previousVerify || !hashVerify||!correctTransactions){chainIsValid=false;}
        return chainIsValid;
    }
        
    hashing(previousHash, currentData, nonce) {
const stringLast=previousHash+ nonce.toString()+JSON.stringify(currentData);
let hash= sha256(stringLast);
return hash;
    }
    proofOfWork(previousHash,currentData){
        let nonce=0;
        let hash=this.hashing(previousHash,currentData,nonce);
        while(hash.substring(0,4)!="0000"){
            nonce++;
            hash=this.hashing(previousHash,currentData,nonce);
        }
        return nonce;
    }
    getBlock(blockHash){
        let correctBlock=null;
        this.chain.forEach(block=>{
            if (block.hash===blockHash){
                correctBlock=block;
            }   
        })
        return correctBlock;
    }
    getTransaction(transactionID){
        let correctTransactionBlock =null;
        let correctTransaction=null;
        this.chain.forEach(block=>{
            block.transactions.forEach(transactions=>{
            if(transactions['transactionId']===transactionID){
            correctTransactionBlock=block;
            correctTransaction=transactions;
            }
        })
    })
        return {transaction:correctTransaction,block:correctTransactionBlock};
    }
    getAddress(address){
        const addressTransactions = [];
        this.chain.forEach(block => {
            block.transactions.forEach(transaction => {
                if(transaction.sender === address || transaction.receiver === address) {
                    addressTransactions.push(transaction);
                };
            });
        });
    
        let balance = 0;
        addressTransactions.forEach(transaction => {
            if (transaction.receiver === address) balance += transaction.amount;
            else if (transaction.sender === address) balance -= transaction.amount;
        });
    
        return {
            addressTransactions: addressTransactions,
            addressBalance: balance
        }; 
    }
}
module.exports=Blockchain;