require('dotenv').config()
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const webSocketsServerPort = process.env.PORT;
const webSocketServer = require('websocket').server;
const http = require('http');
const { getAudioDurationInSeconds } = require('get-audio-duration')
const server = http.createServer();
server.listen(webSocketsServerPort);
const wsServer = new webSocketServer({
    httpServer: server
});


const LOCAL_MUSIC = process.env.LOCAL_MUSIC
const REMOTE_MUSIC = process.env.REMOTE_MUSIC

console.log("Server started at port", webSocketsServerPort)

const getUniqueID = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4() + s4() + '-' + s4();
};

const typeDefinition = {
    LOGIN: "login",
    PAUSE: "pause",
    PLAY: "play",
    SONG_UPDATE: "song_update",
    TIME_UPDATE: "time_update",
    MESSAGE: "msg"
}
const clients = {};
let users = {};
let sessionData = {};
let songList = []

async function updateSongList() {
    songList = await (await fetch(process.env.SONG_LIST)).json()
}
updateSongList()
setInterval(updateSongList, 60000)

/* 
sessionData = {
           sessionId: {
                id: any,
                currentSongUrl: string,
                songTimestamp: number,
                songMaxTimestamp: number,
                songState: "playing" | "paused" | "idle",
                connectedUsers: {usrId: {}, usrId2: {},...}
            },....}
*/


const updateSessions = () => {

    Object.keys(sessionData).forEach((key) => {
        //console.log(sessionData[key])
        if (sessionData[key].songState == "playing") {
            sessionData[key].songTimestamp++;
        } else if (sessionData[key].songState == "paused") {
            if (sessionData[key].songTimestamp >= sessionData[key].songMaxTimestamp - 1) {
                const s = songList[Math.floor(Math.random() * songList.length)]
                sessionData[key].currentSongUrl = REMOTE_MUSIC + "/" + s
                sessionData[key].songState = "playing"
                sessionData[key].songTimestamp = 0
                getAudioDurationInSeconds(LOCAL_MUSIC + "/" + s).then((duration) => {
                    sessionData[key].songMaxTimestamp = duration
                    sendMessage(JSON.stringify({ type: typeDefinition.SONG_UPDATE, sessionId: key, data: { songUrl: sessionData[key].currentSongUrl, by: "server", sessionData: sessionData[key] } }))
                })
            }
        }

    });

}



const sendMessage = (json) => {
    Object.keys(clients).map((client) => {
        clients[client].sendUTF(json);
    });
    console.log("Sent:", json)
}

setInterval(updateSessions, 1000)


wsServer.on('request', function (request) {
    var userID = getUniqueID();
    console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
    const connection = request.accept(null, request.origin);
    clients[userID] = connection;
    console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(clients));
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            const dataFromClient = JSON.parse(message.utf8Data);
            console.log("Session Data:", sessionData)
            console.log("Received:", dataFromClient)
            switch (dataFromClient.type) {
                case typeDefinition.LOGIN:
                    users[userID] = {
                        id: userID,
                        username: dataFromClient.username,
                        sessionId: dataFromClient.sessionId
                    }

                    if (users[userID].sessionId in sessionData) {
                        sessionData[users[userID].sessionId].connectedUsers[users[userID].id] = users[userID]
                    } else {
                        // init session in obj
                        sessionData[users[userID].sessionId] = {
                            id: users[userID].sessionId,
                            currentSongUrl: "",
                            songTimestamp: 0,
                            songMaxTimestamp: 0,
                            songState: "idle",
                            connectedUsers: {}
                        }
                        sessionData[users[userID].sessionId].connectedUsers[users[userID].id] = users[userID]
                        console.log("Session Data:", sessionData)
                    }

                    console.log(`Session ${users[userID].sessionId} connected users:`, sessionData[users[userID].sessionId].connectedUsers)
                    clients[userID].sendUTF(JSON.stringify({ type: typeDefinition.LOGIN, userId: users[userID].id, sessionId: users[userID].sessionId, data: { userId: userID, sessionData: sessionData[users[userID].sessionId] } }))
                    sendMessage(JSON.stringify({ type: typeDefinition.MESSAGE, sessionId: users[userID].sessionId, data: { message: `${users[userID].username} joined the session!`, sessionData: sessionData[users[userID].sessionId] } }))
                    break
                case typeDefinition.PLAY:
                    sessionData[users[userID].sessionId].songState = "playing"
                    sendMessage(JSON.stringify({ type: typeDefinition.PLAY, userId: users[userID].id, sessionId: users[userID].sessionId, data: { by: users[userID].username, sessionData: sessionData[users[userID].sessionId] } }))
                    break
                case typeDefinition.PAUSE:
                    sessionData[users[userID].sessionId].songState = "paused"
                    sendMessage(JSON.stringify({ type: typeDefinition.PAUSE, userId: users[userID].id, sessionId: users[userID].sessionId, data: { by: users[userID].username, sessionData: sessionData[users[userID].sessionId] } }))
                    break
                case typeDefinition.SONG_UPDATE:
                    getAudioDurationInSeconds(LOCAL_MUSIC + "/" + dataFromClient.fileName).then((duration) => {
                        console.log(duration)
                        sessionData[users[userID].sessionId].songState = "playing"
                        sessionData[users[userID].sessionId].songTimestamp = 0
                        sessionData[users[userID].sessionId].songMaxTimestamp = duration
                        sessionData[users[userID].sessionId].currentSongUrl = dataFromClient.songUrl
                        sendMessage(JSON.stringify({ type: typeDefinition.SONG_UPDATE, userId: users[userID].id, sessionId: users[userID].sessionId, data: { songUrl: dataFromClient.songUrl, by: users[userID].username, sessionData: sessionData[users[userID].sessionId] } }))
                    })
                    break
                case typeDefinition.TIME_UPDATE:
                    sessionData[users[userID].sessionId].songTimestamp = dataFromClient.timestamp
                    sendMessage(JSON.stringify({ type: typeDefinition.TIME_UPDATE, userId: users[userID].id, sessionId: users[userID].sessionId, data: { songUrl: dataFromClient.songUrl, by: users[userID].username, sessionData: sessionData[users[userID].sessionId] } }))
                    break;
                case typeDefinition.MESSAGE:
                    sendMessage(JSON.stringify({ type: typeDefinition.MESSAGE, userId: users[userID].id, data: { message: dataFromClient.message, sessionData: sessionData[users[userID].sessionId] } }))
                    break
                default:
                    break
            }
        }
    });
    connection.on('close', function (connection) {
        console.log((new Date()) + " Peer " + userID + " disconnected.");

        let tmp = users[userID].username
        let tmp2 = sessionData[users[userID].sessionId]
        let tmp3 = users[userID].sessionId
        delete sessionData[users[userID].sessionId].connectedUsers[userID]

        if (Object.keys(sessionData[users[userID].sessionId].connectedUsers).length <= 0) {
            delete sessionData[users[userID].sessionId]
        }

        delete clients[userID];
        delete users[userID];

        sendMessage(JSON.stringify({ type: typeDefinition.MESSAGE, sessionId: tmp3, data: { message: `${tmp} left the session!`, sessionData: tmp2 } }))
        console.log("Session Data:", sessionData)
    });
});