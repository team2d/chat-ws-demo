const
    cryptchat = require('./cryptChat'),
    http = require('http'),
    WebSocketServer = require('ws').Server;

(async ()=>{
    await cryptchat.genKeyAsync();
    let httpServer = http
        .createServer(cryptchat.onHTTPConnection)//(req, response)
        .listen(process.env.PORT || 80, '0.0.0.0')

    let webSocketServer = new WebSocketServer({
        server: httpServer,
        path: '/wsApi'
    })
    webSocketServer.on('connection', cryptchat.onWSConnection)
    console.log('Started.')
})()
