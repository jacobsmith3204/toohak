"use strict"
console.log("starting...")
const WebSocket = require('ws');

var wss = new WebSocket.Server({
    port:8001
});

class Game {
	
	constructor(id,hostWS,questions,showQuestionsOnClient){
		this.players= [];
		this.questionStartTime = undefined;
		this.totalAnswers = 0;
		this.id= id;
		this.host = hostWS;
		this.showQuestionsOnClient = showQuestionsOnClient;
		this.questions = [];
		this.qi = -1;
		// NOw, parse the questions
		let lines = questions.split("\n");
		for(let element of lines){
			var row = element.split("\t");
			if(row.length <5) continue;
			var newQ = {ans:[],correct:[]};
			newQ.question = row[0];
			newQ.ans.push(row[1])// add answer 1
			newQ.correct.push(row[2] == "y")// add if answer 1 correct
			newQ.ans.push(row[3])// add answer 2
			newQ.correct.push(row[4] == "y")
			if(row.length >= 7 && row[5] != ""){
				newQ.ans.push(row[5])// add (optional) answer 3
				newQ.correct.push(row[6] == "y")
				if(row.length >= 9 && row[7] != ""){
					newQ.ans.push(row[7])// add (optional) answer 4
					newQ.correct.push(row[8] == "y")
				}
			}
			if(row.length >= 10 && row[9] != ""){
				newQ.image = row[9]
			}
			this.questions.push(newQ);
		};
	}
	
	sendQuestion(){
		this.qi++;
		this.totalAnswers = 0;
		// end game if got to last question
		if(this.qi >= this.questions.length){
			this.endGame();
			return;
		}
		let question = this.questions[this.qi];
		if(this.showQuestionsOnClient){
			for(let i of this.players){
				i.send(JSON.stringify({
					type:"question",
					question:question.question,
					image:question.image,
				}))
			}
		} 
		this.host.send(JSON.stringify({
			type:"question",
			question:question.question,
			questionNumber:this.qi + 1,
			image:question.image,
			total:this.questions.length,
		}))
	}
	sendAnsOptions(){
		let question = this.questions[this.qi];
		this.questionStartTime = new Date().getTime();
		if(this.showQuestionsOnClient){
			for(let i of this.players){
				i.send(JSON.stringify({
					type:"answerText",
					answers:question.ans,
					image:question.image
				}))
			}
		} else {
			for(let i of this.players){
				i.send(JSON.stringify({
					type:"answerCount",
					count:question.ans.length,
				}))
			}
		}
		this.host.send(JSON.stringify({
			type:"answerText",
			answers:question.ans,
			image:question.image
		}))
	}
	sendQuestionStats(){
		// first, calculate who was right and who was wrong for the question we just did, and update scores
		// also calculate number of people to choose each answer
		let question = this.questions[this.qi];
		let tally = new Array(question.ans.length).fill(0)// make an array to tally up who chose what answer
		for(let player of this.players){
			let scoreDelta = 0;
			let correct = false;

			if(player.answer != undefined){
				// increment tally of who chose what
				tally[player.answer]++;
				// award points if correct
				if(question.correct[player.answer]){
					// scoring: 500 points plus 500pts * percentage of time left of 20seconds * 500
					scoreDelta = 500 + Math.ceil((20000-(player.qFinishTime - this.questionStartTime))/(20000)*500)
					player.score += scoreDelta
					correct=true;
				}
			}
			
			player.send(JSON.stringify({
				type:"qFinished",
				score:player.score,
				scoreChange:scoreDelta,
				correct:correct,
				gameOver:this.qi >= this.questions.length -1// game over if that was the last question
			}))
			player.answer = undefined;
			player.qfinishTime = undefined;
			
		}
		// next, sort results (descending order of score), then tell each player their placing
		this.players.sort((a,b)=>{return  b.score - a.score})
		for(let i = 0; i < this.players.length;i++){
			this.players[i].send(JSON.stringify({
				type:"placingUpdate",
				place:i+1,
				behind:i > 0 ? this.players[i-1].name  : "nobody, good job!"
			}))
		}
		// finally, send stats to host
		this.host.send(JSON.stringify({
			type:"qstats",
			percentages:tally.map(val=>(val * 100 / this.players.length)),// convert tally to percentage chosen
			correct:question.correct,
			leaders:this.players.slice(0,5).map(player=>player.name),// get the leader's names
			gameOver:this.qi >= this.questions.length -1
		}))
		if(this.qi >= this.questions.length -1) this.endGame();
	}
	endGame(){
		// deletes all references to itself.
		this.players.forEach(ws=>{
			ws.connectedGame = undefined;
			ws.name = "";
			ws.score = 0;
			ws.answer = undefined;
			ws.qFinishTime = undefined;
		})
		this.host.connectedGame = undefined;
		delete game[this.id];
	}
	
}
let game ={};

wss.on('connection', function connection(ws) {
	console.log("established connection with old server");
	ws.connectedGame = undefined;
	ws.name = "";
	ws.score = 0;
	ws.qFinishTime = undefined;
	ws.answer = undefined;// index of answer
	ws.on('message', function incoming(str) {// assuming data is always string
		try{
		console.log("message:" + str)
		let data = JSON.parse(str)
		switch(data.type){
			case "join":
				if(game[data.id] == undefined || game[data.id] == null){
					ws.send(JSON.stringify({
						type:"message",value:"Invalid game ID"
					}))
					return;
				}
				if(!(ws.name == undefined || ws.name == "")){
					ws.send(JSON.stringify({
						type:"message",value:"You're already in a game. Cheeky!"
					}))
					console.log(ws.name)
					return;
				}
				if(game[data.id].players.indexOf(data.name) > -1){
					ws.send(JSON.stringify({
						type:"message",
						value:"That name is already taken in that game"
					}))
					return;
				} 
				game[data.id].players.push(ws)
				ws.connectedGame = game[data.id]
				ws.name = data.name;
				ws.send(JSON.stringify({
					type:"enterGame",
				}))
				ws.connectedGame.host.send(JSON.stringify({type:"addPlayer",name:data.name}));
				ws.score = 0;
				break;
			case "host":
				if(game[data.id] != undefined){
					ws.send(JSON.stringify({
						type:"message",value:"That game already exists"
					}))
					return;
				}
				game[data.id] = new Game(data.id,ws,data.questions,data.showQuestionsOnClient)
				ws.connectedGame = game[data.id]
				ws.send(JSON.stringify({
					type:"host",
					id:data.id
				}))
				break;
			case "nextQuestion": // and for starting game as well
				if(!isHost(ws)) break;

				ws.connectedGame.sendQuestion();
				break;
			case "answer":
				ws.answer = data.answer;
				ws.connectedGame.totalAnswers++;
				ws.qFinishTime = new Date().getTime();
				if(ws.connectedGame.totalAnswers == ws.connectedGame.players.length) ws.connectedGame.sendQuestionStats()
				break;
			case "showOptions": 
				if(!isHost(ws)) return;
				ws.connectedGame.sendAnsOptions();
				break;
			case "showAnswer":
				// send qstats to host, qFinished to client
				if(!isHost(ws)) return;
				ws.connectedGame.sendQuestionStats();
				break;
			case "kickPlayer":
				if(!isHost(ws)) break;
				let index = ws.connectedGame.players.indexOf(data.name)
				if(index > -1){
					ws.connectedGame.players.splice(index,1);
					ws.send(JSON.stringify({
						type:"removePlayer",
						name:data.name
					}))
				}
				break;
			default:
				console.warn("type " + data.type +"is not  a valid type")
		}
		} catch ( e){console.log(e)}
	});
	ws.on("close",()=>{
		try{

		if(ws.connectedGame == undefined) return
		if(ws.connectedGame.host == ws){
			//KICK EVERYONE FROM GAME
			ws.connectedGame.players.forEach(player => {
				player.send(JSON.stringify({
					type:"kick",
					reason:"Host Left."
				}))
			});
			ws.connectedGame.endGame();
			return
		}
		ws.connectedGame.host.send(JSON.stringify({
			type:"removePlayer",
			name:ws.name
		}))
		ws.connectedGame.players.splice (ws.connectedGame.players.indexOf(ws), 1);
		} catch{error =>{console.log(error)}}

	})
});
function isHost(ws){
	if(ws.connectedGame == undefined || ws.connectedGame.host != ws){
		ws.send(JSON.stringify({
			type:"message",value:"You aren't no host"
		}))
		return false;
	}
	return true;
}
console.log("Started Websocket server")


module.exports = { Game };