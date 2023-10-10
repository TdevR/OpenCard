const express = require('express');
const app = express();
const Blockchain = require('./blockchain.js');
const bitcoin = new Blockchain();
const { v1: uuidV1 } = require('uuid');
const nodeAddress = uuidV1().split('-').join('');
const port = process.argv[2];
const axios = require('axios');
app.use(express.json());
app.get('/', function (req, res) {
    res.send("works");
})
app.get('/blockchain', function (req, res) {
    res.send(bitcoin);
});
app.post('/transaction/broadcast', function (req, res) {
    const transaction=bitcoin.createTransaction(req.body.amount, req.body.sender, req.body.receiver);
    bitcoin.addTransactionToPendingTransaction(transaction);
    const transactionArray=[];
    bitcoin.networkNodes.forEach(nodeurl=>{
        const transactionOptions={
            url:nodeurl+'/transaction',
            method:'POST',
            data:transaction,
           // json:true
        }   
        transactionArray.push(axios(transactionOptions))});
    
        Promise.all(transactionArray)
        .then(data=>{
            res.send("added successfully");
        }) 
        .catch(err=>{
            console.error(err);
            res.status(500).send("error occurred");
        })   
     });
app.post('/transaction',function(req,res){
    const pendingTransaction=req.body;
    const blockIndex=bitcoin.addTransactionToPendingTransaction(pendingTransaction);
    
res.json({note:`transaction will be added in ${blockIndex}`});
});
app.get('/mine', function (req, res) {
    let currentData = { transactions: bitcoin.newTransaction };
    previousHash = bitcoin.getLastBlock()['hash'];
    const nonce = bitcoin.proofOfWork(previousHash, currentData);
    const hash = bitcoin.hashing(previousHash, currentData, nonce);
    
    const newBlock = bitcoin.createNewBlock(nonce, previousHash, hash);
    //if((bitcoin.getLastBlock().hash==newBlock.previousBlockHash)&&(bitcoin.getLastBlock().index+1==newBlock.index)){
     //   bitcoin.chain.push(newBlock);
   // }
    const reqarray=[];
    bitcoin.networkNodes.forEach(nodeurl=>{

    const requestOption={
        url:nodeurl+'/acceptBlock',
        method:'POST',
        data:{newBlock:newBlock}
    }
    reqarray.push(axios(requestOption));
    })
    Promise.all(reqarray)
    .then(data=>{
        
        const reqoption={
            url:bitcoin.currentNodeUrl+'/transaction/broadcast',
            method:'POST',
            data:{amount:12.5,
            sender:'00',
        receiver:nodeAddress}}
        return axios(reqoption);
        })
    
    .then(data=>{
        res.json({note:'added newblock',
        newblock:newBlock});
    })
    .catch(err=>{
        console.error(err);
        res.status(500).send("error");
});
    //res.json({ note: 'new block added successfully', block: newBlock });
});
app.get('/consensus',function(req,res){
    const reqArray=[];
    bitcoin.networkNodes.forEach(nodeUrl=>{ 
        const reqOptions={
            url:nodeUrl+'/blockchain',
            method:'GET'
        }
        reqArray.push(axios(reqOptions));
    })
    Promise.all(reqArray)
    .then(blockchains=>{
            
        const currentChainLength=bitcoin.chain.length;
        let maxLengthChain=null;
        let maxChainLength=currentChainLength;
        let pending=null;
        blockchains.forEach(response=>{
            let blockchain=response.data;
            if(blockchain.chain.length>maxChainLength){
                maxChainLength=blockchain.chain.length;
                maxLengthChain=blockchain.chain;
                pending=blockchain.newTransaction;
            }});
            if(!maxLengthChain||(maxLengthChain&&!bitcoin.isChainValid(maxLengthChain)))
            {
                res.json({note:"not replaced",
        chain:bitcoin.chain,
    });
            }else {bitcoin.chain=maxLengthChain;
                bitcoin.newTransaction=pending;
                res.json({note:"chain is replaced",
            chain:maxLengthChain});
            } 
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Error occurred during consensus.");
        });
});


app.post('/acceptBlock',function(req,res){

    const newBlock=req.body.newBlock;

    const lastBlock=bitcoin.getLastBlock();
    const correctHash = lastBlock.hash == newBlock.previousBlockHash; 
	const correctIndex = lastBlock['index'] + 1 == newBlock.index;
    console.log(lastBlock.hash);
    console.log(lastBlock.index+1);
    console.log(newBlock.index);
    console.log(newBlock.previousBlockHash);
    if (correctHash && correctIndex)
    {
        bitcoin.chain.push(newBlock);
        bitcoin.newTransaction=[];
res.json({note:"block added to chain",
newBlock:newBlock})}
else {
    res.json({
        note: 'New block rejected.',
        newBlock: newBlock
    });
}})
app.post('/register-and-broadcast-new-node-url', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1) { bitcoin.networkNodes.push(newNodeUrl); }
    const regNodesPromises = [];
    bitcoin.networkNodes.forEach(networkNodes => {
        const requestOption = {
            url: networkNodes + '/register-node',
            method: 'POST',
            data: { newNodeUrl: newNodeUrl },
            json: true
        }
        regNodesPromises.push(axios(requestOption));
    });
    Promise.all(regNodesPromises)
        .then(data => {
            const bulkRegisterOptions = {
                url: newNodeUrl + '/register-bulk-node',
                method: 'POST',
                data: { allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl] },
                json: true
            };
            return axios(bulkRegisterOptions);
        })
        .then(data => {
            res.send({ note: "New node registered with other nodes successfully" });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send({ error: 'An error occurred during registration.' });
        });
        //res.send({note:"successfull"});
});

app.post('/register-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    if ((bitcoin.networkNodes.indexOf(newNodeUrl) == -1) && (bitcoin.currentNodeUrl != newNodeUrl)) { bitcoin.networkNodes.push(newNodeUrl); }
    res.json({ note: 'new node successfully registered with this node' });
});

app.post('/register-bulk-node', function (req, res) {
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(nodeUrl => {
        if ((bitcoin.networkNodes.indexOf(nodeUrl) == -1) && (bitcoin.currentNodeUrl != nodeUrl)) { bitcoin.networkNodes.push(nodeUrl); }
    });
res.json({note:"successfull"});
});
app.get('/block/:blockhash',function (req,res){
const blockhash= req.params.blockhash;
const correctBlock=bitcoin.getBlock(blockhash);
res.json({note:"correct block found",block:correctBlock});
})
app.get('/transaction/:transactionID',function (req,res){
    const transactionID= req.params.transactionID;
    const correctTransactionBlock=bitcoin.getTransaction(transactionID);
    res.json({transaction:correctTransactionBlock.transaction,block:correctTransactionBlock.block});
    })
    app.get('/address/:address', function(req, res) {
        const address = req.params.address;
        const addressData = bitcoin.getAddress(address);
        res.json({
            addressTransactions: addressData.addressTransactions,amount:addressData.addressBalance
        });
    });
app.listen(port, function () {
    console.log(`listening on port ${port}.`);
});