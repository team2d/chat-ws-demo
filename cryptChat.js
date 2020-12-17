module.exports = (()=>{
    const
        aesjs = require('aes-js'),
        uuidv4 = require('uuid/v4'),
        forge = require('node-forge'),
        db = new (require('nedb'))({filename : 'chat.db', autoload: true }),
        express = require('express'),
        expressApp = express()
            .use(express.static(__dirname + '/public'))
            .use(express.static(__dirname + '/node_modules/bootstrap/dist'))
            .use(express.static(__dirname + '/node_modules/jquery/dist'))
            .get('/io.js', (req,res) => res.sendFile(__dirname + '/io.js'))
            .get('/forge.all.min.js', (req,res) => res.sendFile(__dirname + '/node_modules/node-forge/dist/forge.all.min.js'));
            //.get('/prime.worker.min.js', (req,res) => res.sendFile(__dirname + '/node_modules/node-forge/dist/forge.min.js'));

    let keypair;
    const genKeyAsync = () => {
        return new Promise((resolve, reject) => {
            forge.rsa.generateKeyPair({bits: 2048, workers: -1}, function(err, tkeypair) {
                keypair = tkeypair;
                resolve()
            })
        })
    }
    const aes = {
        encoder(key) {
            key = aesjs.utils.hex.toBytes(key);
            let aesCtr = new aesjs.ModeOfOperation.ctr(key);
            return (message)=>{
                let textBytes = aesjs.utils.utf8.toBytes(message);
                let encryptedBytes = aesCtr.encrypt(textBytes);
                return encryptedBytes;
            }
        },
        decoder(key) {
            key = aesjs.utils.hex.toBytes(key);
            let aesCtr = new aesjs.ModeOfOperation.ctr(key);
            return (message)=>{
                let buf = new Uint8Array(message);
                let decryptedBytes = aesCtr.decrypt(buf);
                let decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
                return decryptedText;
            }
        }
    }
    const ioLib = require('./io');
    const timestamp = () => {
        return Math.floor(Date.now() / 1000)
    }
    const echo = (...mes) => console.log(...mes);
    const hashHex128 = () => {
        let eventHolder = (uuidv4());
        eventHolder = eventHolder.replace(/-/g,"");
        return eventHolder;
    }
    let clients = {}
    const api = {
        async connect(ws, urlFrom) {
            ws.api.state('securing...','glyphicon glyphicon-hourglass');
            //forge.rsa.generateKeyPair({bits: 2048, workers: -1}, function(err, keypair) {
            ws.privateKey = keypair.privateKey;
            var pem = forge.pki.publicKeyToPem(keypair.publicKey);
            ws.api.rsaKem(pem);
            //});
            echo (urlFrom);
        },
        async assignKey(ws,protectedData) {
            let [encrypted,iv,tag,encapsulation] = protectedData;
            // decrypt encapsulated 16-byte secret key
            let kdf1 = new forge.kem.kdf1(forge.md.sha1.create());
            let kem = forge.kem.rsa.create(kdf1);
            let key = kem.decrypt(ws.privateKey, encapsulation, 16);

            // decrypt bytes
            let decipher = forge.cipher.createDecipher('AES-GCM', key);
            decipher.start({iv: iv, tag: tag});
            decipher.update(forge.util.createBuffer(encrypted));
            let pass = decipher.finish();
            // pass is false if there was a failure (eg: authentication tag didn't match)
            if(pass) {
                let key = decipher.output.getBytes()
                ws.api.aes('encrypt',aes.encoder(key))
                let inKey = forge.random.getBytesSync(32);//hashHex128()
                inKey = forge.util.bytesToHex(inKey)
                ws.api.assignKey(inKey)
                ws.api.aes('decrypt',aes.decoder(inKey))
                ws.clientId = hashHex128()
                clients[ws.clientId] = ws
                await ws.api.await.createPublicKey()
                ws.api.state('Connected.','glyphicon glyphicon-lock');
                ws.api.authorize()
            }
        },
        authorize(ws,uid) {
            db.findOne({uid,state: {$exists: true}}, (err, doc)=>{
                let userName
                if (!doc) {
                    userName = hashHex128().substr(0,6)
                    db.insert({uid, userName, state: "online", wsClientId: ws.clientId});
                } else {
                    userName = doc.userName
                    db.update(doc, {...doc, state: "online", wsClientId: ws.clientId},{});
                }
                ws.uid = uid;
                //ws.api.userName(userName);
                ws.api.authorized(userName);
            });
        },
        updateUserListsByCurrentUser(ws) {
            db.find({users: {$in: [ws.uid]}}, (err, channels)=> {
                let users = []
                for(let channel of channels) {
                    for (let user of channel.users) {
                        if (-1 == users.indexOf(user)) users.push(user)
                    }
                }
                for(let user of users) if (ws.uid != user) {
                    for (let cid in clients) {
                        let client = clients[cid]
                        if (client.uid == user) {
                            client.api.userList()
                        }
                    }
                }
            })
        },
        connectToChannel(ws,channelName,setActive=false) {
            return new Promise((resolve, reject) => {
                db.findOne({'channelName':channelName}, (err, doc)=>{
                    if (doc) {
                        if (-1 === doc.users.indexOf(ws.uid))
                            db.update(doc, {$push: { users: ws.uid }}, {});
                        api.updateUserListsByCurrentUser(ws)
                        if (setActive) ws.activeChannel = channelName;
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                })
            })
        },
        channelsList(ws) {
            return new Promise((resolve, reject) => {
                db.find({users: {$in: [ws.uid]}}, (err, channels) => {
                    let list = []
                    if (channels.length > 0) {
                        for (let channel of channels) {
                            list.push(channel.channelName)
                        }
                        ws.api.channelsList(list)
                    }
                    resolve(list)
                })
            })
        },
        setOffline(ws) {
            if (ws.clientId) delete clients[ws.clientId];
            db.findOne({wsClientId: ws.clientId}, (err, doc)=>{
                if (doc) {
                    delete doc.wsClientId
                    db.update(doc, {...doc, state: "offline"}, {});
                    api.updateUserListsByCurrentUser(ws)
                }
            })
        },
        setNickName(ws,userName) {
            db.findOne({wsClientId: ws.clientId}, (err, doc)=>{
                if (doc) db.update(doc, {...doc, userName}, {});
            })
            ws.api.userName(userName);
            api.updateUserListsByCurrentUser(ws)
        },
        async createChannel(ws,channelName,secure = false) {
            db.findOne({'channelName':channelName}, (err, doc)=>{
                if (!doc) {
                    db.insert({'channelName':channelName,'users':[],secure});
                }
            })
        },
        userList(ws) {
            return new Promise((resolve, reject) => {
                db.findOne({'channelName': ws.activeChannel}, (err, channel) => {
                    if (channel) {
                        let list = []
                        for (let user of channel.users) {
                            list.push(user)
                        }
                        db.find({state: "online", uid: {$in: list}}, (err, users) => {
                            let list = {}
                            for (let user of users) {
                                //if (user.state == 'online')
                                list[user.uid] = user.userName
                            }
                            resolve(list)
                        })
                    }
                })
            })
        },
        chatMessages(ws) {
            return new Promise((resolve, reject) => {
                db.find({channelMsg:ws.activeChannel}, (err, msgs) => {
                    let list = []
                    for(let k in msgs) {
                        list[k] = {message:msgs[k].message,uid:msgs[k].uid,time:msgs[k].time}
                    }
                    resolve(list)
                })
            })
        },
        message(ws, message) {
            let msg = {message, uid: ws.uid, time: timestamp()};
            for(let k in clients) {
                if (clients[k].activeChannel == ws.activeChannel)
                clients[k].api.message(msg)
            }
            msg.channelMsg = ws.activeChannel;
            db.insert(msg);
        },
        askKeyFromUID(ws,uid) {
            for(let cid in clients) {
                if (clients[cid].uid === uid) {
                    clients[cid].api.getKey(ws.uid)
                }
            }
        },
        getUserName(ws,uid) {
            return new Promise((resolve, reject) => {
                db.findOne({uid,state: {$exists: true}}, (err, user) => {
                    if (user) resolve(user.userName)
                    else resolve(false)
                })
            })
        }
    }
    api.createChannel(0,'main')
    return {
        onHTTPConnection(req, response) {
            echo("http in: "+req.url)
            return expressApp(req, response)
        },
        onWSConnection(ws) {
            let io = ioLib(api,hashHex128);
            echo("ws accept");
            ws.api = io.routeApiOutput(ws);
            ws.on('message', message => io.routeApiInput(message,ws))
            ws.on('close', ()=>api.setOffline(ws));
        },
        genKeyAsync
    }
})();