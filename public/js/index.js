function date ( format, timestamp ) {

    var a, jsdate = new Date(timestamp ? timestamp * 1000 : null);
    var pad = function(n, c){
        if( (n = n + "").length < c ) {
            return new Array(++c - n.length).join("0") + n;
        } else {
            return n;
        }
    };
    var txt_weekdays = ["Sunday","Monday","Tuesday","Wednesday",
        "Thursday","Friday","Saturday"];
    var txt_ordin = {1:"st",2:"nd",3:"rd",21:"st",22:"nd",23:"rd",31:"st"};
    var txt_months =  ["", "January", "February", "March", "April",
        "May", "June", "July", "August", "September", "October", "November",
        "December"];

    var f = {
        // Day
        d: function(){
            return pad(f.j(), 2);
        },
        D: function(){
            t = f.l(); return t.substr(0,3);
        },
        j: function(){
            return jsdate.getDate();
        },
        l: function(){
            return txt_weekdays[f.w()];
        },
        N: function(){
            return f.w() + 1;
        },
        S: function(){
            return txt_ordin[f.j()] ? txt_ordin[f.j()] : 'th';
        },
        w: function(){
            return jsdate.getDay();
        },
        z: function(){
            return (jsdate - new Date(jsdate.getFullYear() + "/1/1")) / 864e5 >> 0;
        },

        // Week
        W: function(){
            var a = f.z(), b = 364 + f.L() - a;
            var nd2, nd = (new Date(jsdate.getFullYear() + "/1/1").getDay() || 7) - 1;

            if(b <= 2 && ((jsdate.getDay() || 7) - 1) <= 2 - b){
                return 1;
            } else{

                if(a <= 2 && nd >= 4 && a >= (6 - nd)){
                    nd2 = new Date(jsdate.getFullYear() - 1 + "/12/31");
                    return date("W", Math.round(nd2.getTime()/1000));
                } else{
                    return (1 + (nd <= 3 ? ((a + nd) / 7) : (a - (7 - nd)) / 7) >> 0);
                }
            }
        },

        // Month
        F: function(){
            return txt_months[f.n()];
        },
        m: function(){
            return pad(f.n(), 2);
        },
        M: function(){
            t = f.F(); return t.substr(0,3);
        },
        n: function(){
            return jsdate.getMonth() + 1;
        },
        t: function(){
            var n;
            if( (n = jsdate.getMonth() + 1) == 2 ){
                return 28 + f.L();
            } else{
                if( n & 1 && n < 8 || !(n & 1) && n > 7 ){
                    return 31;
                } else{
                    return 30;
                }
            }
        },

        // Year
        L: function(){
            var y = f.Y();
            return (!(y & 3) && (y % 1e2 || !(y % 4e2))) ? 1 : 0;
        },
        //o not supported yet
        Y: function(){
            return jsdate.getFullYear();
        },
        y: function(){
            return (jsdate.getFullYear() + "").slice(2);
        },

        // Time
        a: function(){
            return jsdate.getHours() > 11 ? "pm" : "am";
        },
        A: function(){
            return f.a().toUpperCase();
        },
        B: function(){
            // peter paul koch:
            var off = (jsdate.getTimezoneOffset() + 60)*60;
            var theSeconds = (jsdate.getHours() * 3600) +
                (jsdate.getMinutes() * 60) +
                jsdate.getSeconds() + off;
            var beat = Math.floor(theSeconds/86.4);
            if (beat > 1000) beat -= 1000;
            if (beat < 0) beat += 1000;
            if ((String(beat)).length == 1) beat = "00"+beat;
            if ((String(beat)).length == 2) beat = "0"+beat;
            return beat;
        },
        g: function(){
            return jsdate.getHours() % 12 || 12;
        },
        G: function(){
            return jsdate.getHours();
        },
        h: function(){
            return pad(f.g(), 2);
        },
        H: function(){
            return pad(jsdate.getHours(), 2);
        },
        i: function(){
            return pad(jsdate.getMinutes(), 2);
        },
        s: function(){
            return pad(jsdate.getSeconds(), 2);
        },
        //u not supported yet

        // Timezone
        //e not supported yet
        //I not supported yet
        O: function(){
            var t = pad(Math.abs(jsdate.getTimezoneOffset()/60*100), 4);
            if (jsdate.getTimezoneOffset() > 0) t = "-" + t; else t = "+" + t;
            return t;
        },
        P: function(){
            var O = f.O();
            return (O.substr(0, 3) + ":" + O.substr(3, 2));
        },
        //T not supported yet
        //Z not supported yet

        // Full Date/Time
        c: function(){
            return f.Y() + "-" + f.m() + "-" + f.d() + "T" + f.h() + ":" + f.i() + ":" + f.s() + f.P();
        },
        //r not supported yet
        U: function(){
            return Math.round(jsdate.getTime()/1000);
        }
    };

    return format.replace(/[\\]?([a-zA-Z])/g, function(t, s){
        if( t!=s ){
            // escaped
            ret = s;
        } else if( f[s] ){
            // a date function exists
            ret = f[s]();
        } else{
            // nothing special
            ret = s;
        }

        return ret;
    });
}
function scrollToBottom(){
    let cont = document.querySelector('.content > .chats')
    $(cont).animate({ scrollTop: cont.scrollHeight-cont.clientHeight },150);
}
function chLinkHTML(channel) {
    return '<p><a href="#'+channel+'"><b>#</b>'+channel+'</a></p>'
}
function showChannelsList(channelsNames) {
    let ch = $('.channels')
    ch.empty()
    for(let channel of channelsNames) {
        let a = $(chLinkHTML(channel));
        ch.append(a);
    }
}
function showUserList(userList) {
    let ch = $('.usersList')
    ch.empty()
    for(let uid in userList) {
        let a = $('<p><span class="'+uid+' glyphicon glyphicon-user"> '+userList[uid]+'</span> </p>');
        ch.append(a);
    }
}
function createChatMessage(msg,user,now,me){
    const imgg = 'css/avatar.png'
    const chats = $('.content > .chats')
    const li = $(
        '<li class=' + (!me?'me':'you') + '>'+
        '<div class="image">' +
        '<img src=' + imgg + ' />' +
        '<b></b>' +
        '<i class="timesent">'+now+'</i> ' +
        '</div>' +
        '<p></p>' +
        '</li>');

    // use the 'text' method to escape malicious user input
    li.find('p').text(msg);
    li.find('b').text(user);

    chats.append(li);
}
(()=>{
    let uid
    let nickname
    let currentChannel
    let privateKey
    let publicKeyPem
    let channelUsers
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
    const genKeyAsync = () => {
        return new Promise((resolve, reject) => {
            forge.rsa.generateKeyPair({bits: 2048, workers: -1}, function(err, keypair) {
                resolve(keypair)
            })
        })
    }
    const rsaKemEncrypt = (data, pem) => {
        let publicKey = forge.pki.publicKeyFromPem(pem);
        // generate and encapsulate a 16-byte secret key
        let kdf1 = new forge.kem.kdf1(forge.md.sha1.create());
        let kem = forge.kem.rsa.create(kdf1);
        let result = kem.encrypt(publicKey, 16);
        // result has 'encapsulation' and 'key'

        // encrypt bytes
        let pemAndKey = data;
        let iv = forge.random.getBytesSync(pemAndKey.length);

        let cipher = forge.cipher.createCipher('AES-GCM', result.key);
        cipher.start({iv: iv});
        cipher.update(forge.util.createBuffer(pemAndKey));
        cipher.finish();
        let encrypted = cipher.output.getBytes();
        let tag = cipher.mode.tag.getBytes();
        return [encrypted,iv,tag,result.encapsulation]
    }
    const resolveName = async (uid) => {
        if (channelUsers[uid]) return channelUsers[uid]
        else return await window.ws.api.await.getUserName(uid)
    }
    const showMessage = async (mesInf,scroll=true) => {
        //debugger
        let nowText = date("H:i:s", mesInf.time)
        let username = (mesInf.uid == uid)?nickname:await resolveName(mesInf.uid)
        createChatMessage(mesInf.message, username, nowText, mesInf.uid == uid);
        if (scroll) scrollToBottom();
    }
    const showChatMessages = async (messages) => {
        $('.content > .chats').empty()
        for(let k in messages) {
            await showMessage(messages[k],messages.length-1 == k)
        }
    }
    const hashHex128 = () => {
        const inKey = forge.random.getBytesSync(16);
        return forge.util.bytesToHex(inKey)
    }
    const echo = (...mes) => console.log(...mes);
    const api = {
        setOffline(ws) {
            echo ("offline");
            api.state(0,' Connecting...','connIcon glyphicon glyphicon-refresh')
        },
        rsaKem(ws,pem) {
            let inKey = forge.random.getBytesSync(32);//hashHex128();
            inKey = forge.util.bytesToHex(inKey)
            let protectedData = rsaKemEncrypt(inKey,pem);
            ws.api.assignKey(protectedData);
            ws.api.aes('decrypt',aes.decoder(inKey))
        },
        assignKey(ws,key) {
            ws.api.aes('encrypt',aes.encoder(key))
        },
        state(ws,text,iconClass) {
            let stateEl = document.querySelector('.state .connState')
            let iconEl = document.querySelector('.state .connIcon')
            stateEl.innerText = text;
            iconEl.className = 'connIcon '+iconClass
        },
        authorize(ws,wsId) {
            let localStorage = window.localStorage;
            uid = localStorage.getItem('uid');
            if (!uid) {
                uid = hashHex128()
                localStorage.setItem('uid', uid);
            }
            ws.api.authorize(uid)
        },
        async authorized(ws,username,lastChannel) {
            nickname = username
            if (!lastChannel) lastChannel = 'main';
            await api.selectChannel(ws,lastChannel)
            api.userName(0,username)
        },
        userName(ws,username) {
            document.querySelector('.nickname').value = username;
            document.querySelector('.'+uid).innerText = ' '+username;
            nickname = username
        },
        selectChannel(ws,chennelName,connect=true) {
            return new Promise(async (resolve, reject) => {
                if (connect) {
                    let suc = await ws.api.await.connectToChannel(chennelName, true)
                    if (!suc) resolve(false);
                }
                document.querySelector('.currChannel').innerHTML = chLinkHTML(chennelName)
                let channelsList = await ws.api.await.channelsList()
                showChannelsList(channelsList)
                let userList = await ws.api.await.userList()
                channelUsers = userList;
                showUserList(userList)
                location.hash = '#' + chennelName
                currentChannel = chennelName
                let chatMessages = await ws.api.await.chatMessages()
                showChatMessages(chatMessages)
                resolve(true)
            })
        },
        async createPublicKey() {
            let keypair = await genKeyAsync()
            privateKey = keypair.privateKey
            publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
            console.log(publicKeyPem)
        },
        message(ws, message) {
            showMessage(message)
        },
        getKey(ws, fromUID) {

        },
        async userList(ws) {
            let userList = await ws.api.await.userList()
            channelUsers = userList;
            showUserList(userList)
        }
    };

    window.addEventListener("hashchange", async (e)=>{
        let suc = await api.selectChannel(window.ws,location.hash.substr(1))
        if (!suc) {
            window.location.href = e.oldURL;
        }
        //debugger
    }, false);
    document.querySelector('.setnickname.btn').addEventListener('click',()=>{
        let nick = document.querySelector('.nickname').value;
        window.ws.api.setNickName(nick);
    });
    document.querySelector('.newChennel.btn').addEventListener('click',async ()=>{
        let chennelName = document.querySelector('.newChennelName').value;
        document.querySelector('.newChennelName').value = ''
        await window.ws.api.await.createChannel(chennelName);
        api.selectChannel(window.ws,chennelName)
    });
    document.querySelector('.messageEdit .btn').addEventListener('click',()=>{
        let textarea = document.querySelector('.messageEdit textarea')
        let message = textarea.value;
        if (!message.length) return
        textarea.value = ''
        ws.api.await.message(message)
    });

    (function webSocketConnect(){
        //if (window.location.protocol === "https:") window.location.href = 'http://' + window.location.host;
        let io=ioLib(api,hashHex128);
        let ws = new WebSocket('wss://' + window.location.host + "/wsApi");
        ws.binaryType = "arraybuffer";
        ws.api = io.routeApiOutput(ws);
        ws.onopen = (event) => ws.api.connect(document.location.href)
        ws.onmessage = (event) => io.routeApiInput(event.data,ws);
        ws.onclose = (event) => {
            api.setOffline(ws);
            setTimeout(webSocketConnect, 1000);
        };
        window.ws = ws
    })();
})();
