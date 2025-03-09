

// Player
class Player {

    constructor(socket) {
        this.socket = socket;
        this.connectedGame;
        this.name;
        this.score = 0;
        this.qFinishTime;
        this.answer;
        this.socket.on('message', this.onMessage.bind(this));
        this.socket.on("close", this.disconnect.bind(this));
    }

    async onMessage(str) {
        try {
            str = SanitiseInput(str); 
            
            // converts the string to a json object, then passes it through to the request handler
            console.log("player socket onMessage got message:", str)
            let data = JSON.parse(str)
            switch (data.type) {
                case "join":
                    return this.joinGame(data);
                case "host":
                    return this.hostGame(data);
                case "answer":
                    return this.connectedGame.submitAnswer(this, data);
                // HOST SPECIFIC REQUEST TYPES
                case "nextQuestion": // and for starting game as well
                    return this.requestNextQuestion();
                case "showOptions":
                    return this.requestShowOptions();
                case "showAnswer":
                    return this.requestShowAnswer();
                case "kickPlayer":
                    return this.requestKickPlayer();
                default:
                    console.error(`onMessage default: type  ${data.type} is not a valid type`)
            }
        } catch (e) { console.error("onMessage: ERROR:", e) }


        function SanitiseInput(data){
            var str; 
            if (typeof data === "string" && data.startsWith("<Buffer")) {
                // Extract hex values from the string and recreate the Buffer
                const hexValues = data.match(/[\da-fA-F]{2}/g); // Get hex pairs
                if (hexValues) {
                    data = Buffer.from(hexValues.map(byte => parseInt(byte, 16))); // Convert back to Buffer
                }
            }
            // Convert Buffer to String if necessary
            if (Buffer.isBuffer(data))  str = data.toString(); // Convert Buffer to string
            else if (data instanceof ArrayBuffer)  str = Buffer.from(data).toString(); // Convert ArrayBuffer to string
            else str = data;     
            return str; 
        }
    }

    


    //#region USER REQUESTS 
    joinGame(data) {
        console.log("attempting join game");
        // early exit for invalid game data
        const game = Game.findGame(data.id);
        if (!game) { // if it can't find the game 
            this.send({ type: "message", value: "Invalid game ID" });
            return;
        }
        if (this.name) { // if it already has an assigned name it should already be in a game
            this.send({ type: "message", value: `You're already in a game. Cheeky!` });
            console.log(this.name, "is already in a game");
            return;
        }
        if (game.getPlayer(data.name)) { // if it finds the players name already in the current game
            this.send({ type: "message", value: "That name is already taken in that game" });
            return;
        }
        // finds the game within the game dictionary obj and adds this  player
        this.name = data.name;

        //console.log("trying to add player to ", game);
        game.addPlayer(this);
    }

    hostGame(data) {
        // tries to create a game
        console.log("attempting to host game"); 
        var game = Game.CreateGame(this, data);

        // if successful sends a response to the host client
        if (game) {
            this.connectedGame = game;
            this.send({
                type: "host",
                id: data.id
            });
        }
    }
    //#endregion


    //#region HOST ONLY REQUESTS
    // this.send({ type: "message", value: "You aren't no host"});
    isHost() {
        return (this.connectedGame && this.connectedGame.host == this);
    }
    // requests are host only
    requestShowOptions() {
        if (this.isHost())
            this.connectedGame.pushAnsOptions();
    }
    requestNextQuestion() {
        if (this.isHost()){
            console.log("connected game: ", this.connectedGame);
            this.connectedGame.pushQuestion();
        }
    }
    requestShowAnswer() {
        // send qstats to host, qFinished to client
        if (this.isHost())
            this.connectedGame.sendQuestionStats();
    }
    requestKickPlayer(data) {
        let name = data["name"];
        if (!this.isHost() || !name) return;

        // finds the requested player by their name
        let player = this.connectedGame.getPlayer(name);
        if (player) {
            // removes the player from the game
            this.connectedGame.removePlayer(player);
        }
    }
    //#endregion



    // ConnectionManagment
    kick(reason) {
        this.send({ type: "kick", reason: reason });
        this.disconnect();
    }
    disconnect() {
        try {
            this.name = undefined;
            this.score = 0;
            this.answer = undefined;
            this.qFinishTime = undefined;

            if (this.connectedGame == undefined) return;
            if (this.isHost()) return endGame();
            // removes the player from the game
            this.connectedGame.removePlayer(this);
        }
        catch { error => { console.log(error) } }
    }
    send(data) {
        if (typeof data.TYPE === 'string')
            this.socket.send(data);
        else
            this.socket.send(JSON.stringify(data));
    }
}



// ==== GAME ====  //
/*
  // new json quiz formatted as follows 
  '{
      "type":"quiz",
      "imageURL":"https://images-kahoot",
      "title":"what is the answer?",
      "options":[
      {"option":"the correct one","result":"correct"},
      {"option":"an incorrect one","result":"incorrect"},
      {"option":"another correct one","result":"correct"},
      ]}' 
  */

class Game {
    static games = {}

    constructor(host, data) {
        this.host = host;
        this.players = [];
        this.id = data["id"];
        this.questions = Game.addQuestionsFromString(data.questions);
        this.showQuestionsOnClient = data.showQuestionsOnClient;
        //        
        this.currentQuestionIndex = -1;
        this.questionStartTime = undefined;
        this.answers = {};
        // 
        console.log("created game", this);
        Game.games[this.id] = this;
    }

    static addQuestionsFromString(questionsString) {
        // NOw, parse the questions
        console.log("parsing question string"); 
        let questions = [];
        let lines = questionsString.split("\n");
        for (let element of lines) {
            console.log("decoding line:",element);
            var rows = element.split("\t");
            console.log("got rows:",rows);
            if (rows.length < 5) continue;
            var newQ = { ans: [], correct: [] };
            newQ.question = rows[0];
            newQ.ans.push(rows[1])// add answer 1
            newQ.correct.push(rows[2] == "y")// add if answer 1 correct
            newQ.ans.push(rows[3])// add answer 2
            newQ.correct.push(rows[4] == "y")
            if (rows.length >= 7 && rows[5] != "") {
                newQ.ans.push(rows[5])// add (optional) answer 3
                newQ.correct.push(rows[6] == "y")
                if (rows.length >= 9 && rows[7] != "") {
                    newQ.ans.push(rows[7])// add (optional) answer 4
                    newQ.correct.push(rows[8] == "y")
                }
            }
            if (rows.length >= 10 && rows[9] != "") {
                newQ.image = rows[9]
            }
            questions.push(newQ);
        };
        return questions;
    }

    static CreateGame(host, data) {
        if (Game.games[data.id] != undefined) {
            console.log(`game ${data.id} already exists`)
            host.send({ type: "message", value: "That game already exists" });
            return;
        }
        return new Game(host, data);
    }

    static findGame(id) {
        return Game.games[id];
    }

    //#region  PLAYER MANAGEMENT
    static establishConnection(socket) {
        // when we recieve a new websocket client we create a new player
        // from there the player can decide to connect to a game via a json message.
        // player constructor handles the setup
        new Player(socket);
    }

    addPlayer(player) {
        // exits early if it already has the player 
        if (this.players.indexOf(player) != -1) return;

        // otherwise adds the player
        console.log("adding player");
        this.players.push(player)
        // sets the players defaults for this game
        player.connectedGame = this; 
        player.score = 0;
        // sends a reply to both the host and the player 
        this.host.send({ type: "addPlayer", name: player.name });
        player.send({ type: "enterGame", });
    }

    getPlayer(name) {
        return this.players.find(player => player.name === name);
    }

    removePlayer(player) {
        var index;
        // if valid player disconnect from game 
        if(!player)
            return; 
        player.connectedGame = undefined; 
        
        // return if the player is not part of the games players 
        if((index = this.players.indexOf(player)) == -1)
            return; 
        //otherwise remove from the players list then send an update to the host
        this.players.splice(index, 1);
        // pushes the update to the host
        this.host.send({ type: "removePlayer", name: player.name });
    }
    //#endregion



    // QUIZ QUESTION GAME FLOW  
    // push the question so everyone can see the question (delay before showing options)
    pushQuestion() {
        this.currentQuestionIndex++;
        this.totalAnswers = 0;
        // end game if got to last question
        if (this.currentQuestionIndex >= this.questions.length) {
            this.endGame();
            return;
        }
        // sends the currentQuestion to the host player
        let currentQuestion = this.questions[this.currentQuestionIndex];
        this.host.send({
            type: "question",
            question: currentQuestion.question,
            questionNumber: this.currentQuestionIndex + 1,
            image: currentQuestion.image,
            total: this.questions.length,
        });
        // if allowed sends the question to the other players 
        if (this.showQuestionsOnClient) {
            this.players.forEach(player => player.send({
                type: "question",
                question: currentQuestion.question,
                image: currentQuestion.image,
            }));
        }
    }

    // push the choices to everyone  for them to choose
    pushAnsOptions() {
        let currentQuestion = this.questions[this.currentQuestionIndex];
        this.questionStartTime = new Date().getTime();

        // sends the question response options to the player
        this.host.send({
            type: "answerText",
            answers: currentQuestion.ans,
            image: currentQuestion.image
        });

        // figures out what data it can show the players then sends it to all of them 
        let data =
            (this.showQuestionsOnClient) ?
                {
                    type: "answerText",
                    answers: currentQuestion.ans,
                    image: currentQuestion.image

                } : {
                    type: "answerCount",
                    count: currentQuestion.ans.length,
                }
        this.players.forEach(player => player.send(data));
    }

    submitAnswer(player, data) {
        if (this.answers[player]) {
            console.log(`player ${player.name} has already submitted an answer`);
            return;
        }
        this.answers[player] = {
            answer: data.answer,
            qFinishTime: new Date().getTime(),
        }
        if (this.answers.length == this.players.length) this.connectedGame.sendQuestionStats()
    }

    // once all have chosen or the time has run out, we show the results
    sendQuestionStats() {
        // first, calculate who was right and who was wrong for the question we just did, and update scores
        // also calculate number of people to choose each answer
        let question = this.questions[this.currentQuestionIndex];
        let tally = new Array(question.ans.length).fill(0)// make an array to tally up who chose what answer
        for (let player of this.players) {
            let scoreDelta = 0;
            let correct = false;

            if (player.answer != undefined) {
                // increment tally of who chose what
                tally[player.answer]++;
                // award points if correct
                if (question.correct[player.answer]) {
                    // scoring: 500 points plus 500pts * percentage of time left of 20seconds * 500
                    scoreDelta = 500 + Math.ceil((20000 - (player.qFinishTime - this.questionStartTime)) / (20000) * 500)
                    player.score += scoreDelta
                    correct = true;
                }
            }

            player.send({
                type: "qFinished",
                score: player.score,
                scoreChange: scoreDelta,
                correct: correct,
                gameOver: this.currentQuestionIndex >= this.questions.length - 1// game over if that was the last question
            });
            player.answer = undefined;
            player.qfinishTime = undefined;

        }
        // next, sort results (descending order of score), then tell each player their placing
        this.players.sort((a, b) => { return b.score - a.score })
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].send({
                type: "placingUpdate",
                place: i + 1,
                behind: i > 0 ? this.players[i - 1].name : "nobody, good job!"
            });
        }
        // finally, send stats to host
        this.host.send({
            type: "qstats",
            percentages: tally.map(val => (val * 100 / this.players.length)),// convert tally to percentage chosen
            correct: question.correct,
            leaders: this.players.slice(0, 5).map(player => player.name),// get the leader's names
            gameOver: this.currentQuestionIndex >= this.questions.length - 1
        });
        if (this.currentQuestionIndex >= this.questions.length - 1) this.deleteGame();
    }


    // GAME CONTROLS
    deleteGame() {
        // deletes all references to itself.
        this.players.forEach(player => player.disconnect());
        this.host.connectedGame = undefined;
        delete Game.games[this.id];
    }
    endGame() {
        // KICK EVERYONE FROM GAME
        this.kickPlayers(this.players, "Host Left.");
        this.deleteGame();
    }

    // game user control
    kickPlayers(players, reason) {
        players.forEach((player) => player.kick(reason));
    }
}



module.exports = { Game, Player };