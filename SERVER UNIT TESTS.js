const { Player: Player } = require('./game.js');
const { Game: NewGame } = require('./game.js');
const { Game: OldGame } = require('./old_server.js');
//
const { wss: oldWebsocket } = require('./old_server.js');
const { wss: newWebsocket } = require('./server.js');
// 
const NewGames = NewGame.games;
const { game: OldGames } = require('./old_server.js');
// 
const WebSocket = require('ws');
const EventEmitter = require("events");

// uses events and an override to allow me to subscribe to a websocket.send() method   
const eventBus = new EventEmitter();


var data = {
    id: "0",
    questions: "",
    showQuestionsOnClient: true
}

SetupOverrides();
// creates some objects to use in the tests
//const wsN = new WebSocket("ws://localhost:8001");
//const wsO = new WebSocket("ws://localhost:8001");

console.logWithColor("\n - starting TEST setup...");

// creates fake websocket servers to interface with the server
const wsN = CreateFakeWS("wsNSentData");
const wsO = CreateFakeWS("wsOSentData");

console.logWithColor("- attempting connection to the websocket servers...");
// connects the fake ws to the wsServers
oldWebsocket.emit("connection", wsO);
newWebsocket.emit("connection", wsN);



console.logWithColor("\n - attempting to host a game... sending host request to both and asserting if they are the same");
// sets up a host request 
var hostRequest = { type: "host", id: "0", name: "player", questions: "why did the chicken cross the road\t\t\t\t\t" };


// REQUIRED TO SETUP THE GAME 
console.assert(IsWSresponseIsSame(hostRequest), "host requests failed to match");


console.log("fetching (the newly created) game via its id...")
const o = OldGames[data.id];
const n = NewGames[data.id];
console.assert(o != null && n != null, "failed to get both games", "got both games");
// manually create games
//const o = new OldGame(data.id, wsO, data.questions, data.showQuestionsOnClient);// id,hostWS,questions,showQuestionsOnClient
//const n = new NewGame(player, data); // host data:{id, questions, showQuestionsOnClient}



console.logWithColor("\n -  starting the asserts...");


console.assert(o != null, "failed to find old server's game");
console.assert(n != null, "failed to find new server's game");



// 
console.assert(typeof n["host"]["socket"] === typeof o["host"], "intended websocket locations don't match, or aren't properly assigned");
console.assert(arraysMatch(n["questions"], o["questions"]), "string parsed into the question list don't match");
console.assert(n["showQuestionsOnClient"] === o["showQuestionsOnClient"], "showQuestionsDontMatch");
//testing to see if adding an existing player changes the player length



console.assert(IsWSresponseIsSame({ type: "join", name: "player1", id: data.id }), "player joining response is different");
//
console.assert(IsWSresponseIsSame({ type: "join", name: "player1", id: data.id }), "player joining while already in a game response is different");
// 

console.assert(o.players.length === n.players.length && o.players.length > 0, ` failed adding the new player?` , "players were added sucessfully");


console.assert(IsWSresponseIsSame({ type: "answer", answer: "one" }), "testing player1 answer");




/*
console.assert(() => {
    var len = n["players"].length;
    return len == n["players"].length;
}, "failed to properly handle adding an existing player");
*/


// runs all the tests in the "tests" list then quits
console.log("finished tests, exiting....");
process.exit(0);




function IsWSresponseIsSame(request) {
    var responseNew = captureWSResponse(wsN, "wsNSentData", request);
    var responseOld = captureWSResponse(wsO, "wsOSentData", request);


    var matches = arraysMatch(responseNew, responseOld);

    if (!matches) {
        console.log("wsN:", responseNew);
        console.log("wsO:", responseOld);
    }
    else
        console.log("matching response: ", responseNew);
    return matches;
}








function captureWSResponse(ws, eventName, message) {
    var response = [];
    function AddToResponse(data) { response.push(data); }

    if (typeof message === 'object')
        message = JSON.stringify(message);

    eventBus.on(eventName, AddToResponse);
    ws.emit('message', message); // emits the message to the websocket
    eventBus.removeListener(eventName, AddToResponse);
    return response;
}


function arraysMatch(arr1, arr2) {
    try {
        if(arr1.length !== arr2.length)
            return false; 

        // converts to string 
        arr1str = []; 
        arr1.forEach((e)=>  arr1str.push((typeof e === "object")? JSON.stringify(e): e));
        arr2str = []; 
        arr2.forEach((e)=>  arr2str.push((typeof e === "object")? JSON.stringify(e): e));

        // makes sure we got all responses in the same order 
        arr1str.sort();
        arr2str.sort();

        return arr1str.every((val1, index) => val1 === arr2str[index]);
    }
    catch (e) {
        console.error(e);
    }
}




function CreateFakeWS(sentDataEvent) {
    // an implementation of a websocket that should be able to handle sending and recieving data
    var ws = {
        send: (msg) => {
            eventBus.emit(sentDataEvent, { detail: { data: msg } });
        },
        emit: (event, data) => {
            ws.onEvents[event].forEach(callback => {
                callback(data);
            });
        },
        onEvents: {
            message: [],
            close: []
        },
        on: (event, callback) => {
            console.assert(ws.onEvents[event] != undefined, `event array for ${event} isn't setup`, `adding on["${event}"] to ${sentDataEvent}`);
            ws.onEvents[event].push(callback);
        },
        readyState: WebSocket.OPEN
    }
    return ws;
}


function SetupOverrides() {

    // overrides the console assert function so i can pass it functions to evaluate
    console.assert = function (condition, message, id) {
        switch (typeof condition) {
            case 'boolean':
                if (!condition)
                    console.warn(`\x1b[31m${message}\x1b[0m`);
                else
                    console.log(`\x1b[32m${"passed" + ((id) ? ": " + id : "")}\x1b[0m`);
                return;
            case 'function':
                if (!condition())
                    console.warn(`\x1b[31m${message}\x1b[0m`);
                return;
            default:
                console.error(`\x1b[31m${`condition '${condition}' is invalid: ${message}`}\x1b[0m`);
                return null;
        }
    }
    console.logWithColor = function (...message) {
        console.log(`\x1b[33m ${message}\x1b[0m`);
    }
}
















// Create a fake WebSocket object with basic send/receive capabilities
/*const mockWs = {
    send: (msg) => console.log("Server sent message:", msg),
    on: (event, callback) => {
        if (event === "message") {
            // Simulate receiving a message
            setTimeout(() => callback(JSON.stringify({ type: "connect", message: "Mock connection" })), 100);
        }
    },
    readyState: WebSocket.OPEN
};*/
// Manually trigger the connection event



/*
// not working (i imagine its expecting the ip above to respond)
wsO.onopen = function () {
    console.log("Connected wsO to the WebSocket server");
    // Send the "connect" event and pass data
    wsO.send(JSON.stringify({ type: "connect", message: "Client connected" }));
};
wsN.onopen = function () {
    console.log("Connected wsO to the WebSocket server");
    // Send the "connect" event and pass data
    wsN.send(JSON.stringify({ type: "connect", message: "Client connected" }));
};
*/