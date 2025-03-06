const { Game: NewGame } = require('./game.js');
const { Player: Player } = require('./game.js');
const { Game: OldGame } = require('./old_server.js');
const { wss: wss } = require('./old_server.js');
const WebSocket = require('ws');

// 
const EventEmitter = require("events");
// uses events and an override to allow me to subscribe to a websocket.send() method   
const eventBus = new EventEmitter();

// creates some objects to use in the tests
var wsN = new WebSocket("ws://localhost:8001");
var wsO = new WebSocket("ws://localhost:8001");

wsO.onopen = function() {
    console.log("Connected wsO to the WebSocket server");

    // Send the "connect" event and pass data
    ws.send(JSON.stringify({ type: "connect", message: "Client connected" }));
};


var player = new Player(wsN);
var data = {
    id: "0",
    questions: "",
    showQuestionsOnClient: true
}

SetupOverrides(); 

// creates an instance of both "Game" classes 
const n = new NewGame(player, data); // host data:{id, questions, showQuestionsOnClient}
const o = new OldGame(data.id, wsO, data.questions, data.showQuestionsOnClient); // id,hostWS,questions,showQuestionsOnClient






// 
console.assert(typeof n["host"]["socket"] === typeof o["host"], "intended websocket locations don't match, or aren't properly assigned");
console.assert(arraysMatch(n["questions"], o["questions"]), "string parsed into the question list don't match");
console.assert(n["showQuestionsOnClient"] === o["showQuestionsOnClient"], "showQuestionsDontMatch");
//testing to see if adding an existing player changes the player length
console.assert(() => {
    var len = n["players"].length;
    n.addPlayer(player);// where player is the same 
    return len == n["players"].length;
}, "failed to properly handle adding an existing player");
//testing a "join" request via ws.emit(joinrequest)
console.assert(() => {
    console.log("testing join request");
    var joinRequest = { type:"join", id: "0", name: "player" };
    // put the outgoing data from ws.send, into the responseNew list. 
    
    var responseNew = captureWSResponse(wsN, "wsNSentData", joinRequest); 
    var responseOld = captureWSResponse(wsO, "wsOSentData", joinRequest); 
    
    console.log(responseNew,"\n", responseOld);
 
    return arraysMatch(responseNew, responseOld);
}, "failed to match response of 'onMessage' was testing a 'join' request");







//ws.send(JSON.stringify({data:"new data", value:"this was captured via websocket function override"}));







// runs all the tests in the "tests" list then quits
console.log("finished tests, exiting....");
process.exit(0); 








function captureWSResponse(ws, eventName , message){
    var response = [];
    function AddToResponse(data) { response.push(data); } 

    if(typeof message === 'object')
        message = JSON.stringify(message);

    eventBus.on(eventName, AddToResponse);
    wsN.emit('message', message); // emits the message to the websocket
    eventBus.removeListener(eventName, AddToResponse);
    return response; 
}


function arraysMatch(arr1, arr2) {
    return arr1.length === arr2.length && arr1.every((val, index) => val === arr2[index]);
}


function SetupOverrides(){
    wsO.send = function (data) {
        eventBus.emit("wsOSentData", { detail: { data: data } });
        //_send(data);  // Call the original send function (not needed since theres no server to comunicate with)
    };  
    wsN.send = function (data) {
        eventBus.emit("wsNSentData", { detail: { data: data } });
        //_send(data);  // Call the original send function (not needed since theres no server to comunicate with)
    };
    // overrides the console assert function so i can pass it functions to evaluate
    console.assert = function (condition, message) {
        switch (typeof condition) {
            case 'boolean':
                if (!condition)
                    console.warn(message);
                return;
    
            case 'function':
                if (!condition())
                    console.warn(message);
                return;
            default:
                console.error(`condition ${condition} is invalid`);
                console.warn(message);
                return null;
        }
    }
}