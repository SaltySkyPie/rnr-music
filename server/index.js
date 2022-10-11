const webSocketsServerPort = 8081;
const webSocketServer = require('websocket').server;
const http = require('http');
// Spinning the http server and the websocket server.
const server = http.createServer();
server.listen(webSocketsServerPort);
const wsServer = new webSocketServer({
    httpServer: server
});

// Generates unique ID for every new connection
const getUniqueID = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4() + s4() + '-' + s4();
};

// I'm maintaining all active connections in this object
const clients = {};
// I'm maintaining all active users in this object
let users = {};
// The current editor content is maintained here.
let dataHolder = null;



const sendMessage = (json, excludeSender = false, senderId = 0) => {
    // We are sending the current data to all connected clients
    Object.keys(clients).map((client) => {
        if(!excludeSender || client != senderId)
        clients[client].sendUTF(json);
    });
    console.log("Sent:", json)
}

const typeDefinition = {
    LOGIN: "login",
    PAUSE: "pause",
    PLAY: "play",
    SONG_UPDATE: "song_update",
    MESSAGE: "msg"
}

wsServer.on('request', function (request) {
    var userID = getUniqueID();
    console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
    const connection = request.accept(null, request.origin);
    clients[userID] = connection;
    console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(clients));
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            //console.log(users)
            const dataFromClient = JSON.parse(message.utf8Data);
            console.log("Received:", dataFromClient)
            //console.log(users)
            switch (dataFromClient.type) {
                case typeDefinition.LOGIN:
                    /*users[userID].username = dataFromClient.username
                    users[userID].sessionId = dataFromClient.sessionId*/
                    users[userID] = {
                        id: userID,
                        username: dataFromClient.username,
                        sessionId: dataFromClient.sessionId
                    }
                    clients[userID].sendUTF(JSON.stringify({type: typeDefinition.LOGIN, userId: users[userID].id, sessionId: users[userID].sessionId, data: { userId: userID }}))
                    sendMessage(JSON.stringify({ type: typeDefinition.MESSAGE, sessionId: users[userID].sessionId, data: { message: `${users[userID].username} joined the session!` } }))
                    break
                case typeDefinition.PLAY:
                    sendMessage(JSON.stringify({ type: typeDefinition.PLAY, userId: users[userID].id, sessionId: users[userID].sessionId, data: { by: users[userID].username, timestamp: dataFromClient.timestamp, songUrl: dataFromClient.songUrl } }))
                    break
                case typeDefinition.PAUSE:
                    sendMessage(JSON.stringify({ type: typeDefinition.PAUSE, userId: users[userID].id, sessionId: users[userID].sessionId, data: { by: users[userID].username } }), true, users[userID].id)
                    break
                case typeDefinition.SONG_UPDATE:
                    sendMessage(JSON.stringify({ type: typeDefinition.SONG_UPDATE, userId: users[userID].id, sessionId: users[userID].sessionId, data: { songUrl: dataFromClient.songUrl, by: users[userID].username } }), true, users[userID].id)
                    break
                case typeDefinition.MESSAGE:
                    sendMessage(JSON.stringify({ type: typeDefinition.MESSAGE, userId: users[userID].id, data: { message: dataFromClient.message } }))
                    break
                default:
                    break
            }
            //sendMessage(JSON.stringify(dataFromClient));
        }
    });
    // user disconnected
    connection.on('close', function (connection) {
        console.log((new Date()) + " Peer " + userID + " disconnected.");

        if (users[userID] && users[userID] != undefined && users[userID].sessionId != undefined && users[userID].username != undefined) { sendMessage(JSON.stringify({ type: typeDefinition.MESSAGE, sessionId: users[userID].sessionId, data: { message: `${users[userID].username} left the session!` } })); }
        delete clients[userID];
        delete users[userID];
    });
});