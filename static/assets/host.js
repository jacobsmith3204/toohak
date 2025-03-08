var connection = new WebSocket("ws://localhost:8001");
var landing,lobby,questionScreen,leaderboard,gameFinished;
var answers, percentages, topFive,image,playerlist
var onLastQuestion;

var questionInterval,answerInterval,countdownDisplay,countdown;
function q(sel){return document.querySelector(sel)}

var bgMusic = new Audio("assets/Atmospheria-FrancisPreve.mp3")
var crash = new Audio("assets/crash.mp3")
bgMusic.loop = true;
window.onload = ()=>{
    landing = q(".landing")
    lobby = q(".lobby")
    questionScreen = q(".questionScreen")
    leaderboard = q(".leaderboard")
    
    answers = q(".answers")
    percentages = q(".percentages")
    topFive = q(".topFive")
    image = q(".image")
    playerlist = q(".playerlist")
    countdownDisplay = q(".countdown")

    // allow tab key in questions area
    q("#questions").onkeydown = function(e){
        if(e.keyCode==9 || e.which==9){
            e.preventDefault();
            var s = this.selectionStart;
            this.value = this.value.substring(0,this.selectionStart) + "\t" + this.value.substring(this.selectionEnd);
            this.selectionEnd = s+1; 
        }
    }
}

connection.onmessage = (event)=>{
    let data = JSON.parse(event.data)
    console.log(data);
    switch(data.type){
        case "host":
            // server approved hosting the game
            show(lobby)
            document.querySelectorAll(".gameID").forEach(location=>{location.innerHTML = data.id})
            q(".leaderboardtitle").innerHTML = "Leaderboard"
            bgMusic.play();
            break;
        case "question":
            // when got question to show
            show(questionScreen)
            // hide percentages,answers, show question
            percentages.style.display = "none"
            q(".question").innerHTML = data.question;
            q(".questionNumber").innerHTML = data.questionNumber;
            q(".questionTotal").innerHTML = data.total
            onLastQuestion = (data.questionNumber == data.total)
            bgMusic.pause();
            // blank answers
            answers.style.display = "none"
            q("#showLeaderboardBtn").style.display="none";
        break;
        case "answerText":
            // when the server sends the answer options out to everyone
            q("#finishQuestionBtn").style.display = "block";
            answers.style.display = "flex"
            bgMusic.play();
            // display answers
            for(let i = 0; i < 4; i++){
                if(i < data.answers.length){
                    answers.children[i].innerHTML = data.answers[i]
                    answers.children[i].style.display = "block";

                } else{
                    answers.children[i].style.display = "none";
                }
            }
            if(data.image == undefined || data.image == ""||data.image == null)
                image.style.display = "none"
            else {
                image.style.display = "block"
                image.src = data.image
            }
            break;
        case "qstats":
            // when the host says they have had enough time to answer the question, 
            // and the server sends the statistics back
            clearInterval(answerInterval)
            countdownDisplay.style.display = "none"
            percentages.style.display = "block";
            image.style.display = "none";
            bgMusic.pause();
            crash.play();
            // display percentages
            for(let i = 0; i < 4; i++){
                if(i < data.percentages.length){
                    percentages.children[i].style.width = data.percentages[i] + "%"
                    percentages.children[i].style.display = "block";
                    if(data.correct[i]){
                        percentages.children[i].innerHTML = "✓"
                    }else {
                        percentages.children[i].innerHTML = "⨯"
                    }

                } else{
                    percentages.children[i].style.display = "none";
                }
            }
            // display leaderboard
            for(let i = 0; i < data.leaders.length; i++){
                topFive.children[i].innerHTML = data.leaders[i]
            }
            q("#showLeaderboardBtn").style.display="block";
            q("#finishQuestionBtn").style.display = "none";
            // update leaderboard to game over board if game over
            if(data.gameOver){
                q("#leaderboardNext").style.display = "none"
                q("#leaderboardGameOver").style.display = "block"
                q(".leaderboardtitle").innerHTML = "Game Over!"
            } else {
                q("#leaderboardNext").style.display = "block"
                q("#leaderboardGameOver").style.display = "none"
            }
        break;
        case "message":
            alert(data.value);
            break;
        case "addPlayer":
            el = document.createElement("h2")
            el.innerHTML = data.name
            el.addEventListener("click",()=>{connection.send(JSON.stringify({
                type:"kickPlayer",
                name:data.name
            }))})
            playerlist.appendChild(el)
            break;
        case "removePlayer":
            for(let i of playerlist.children){
                if(i.innerHTML == data.name){
                    playerlist.removeChild(i)
                    break;
                }
            }
            break;
        default:
            console.warn(data.type + " is not yet implemented")
    }
        
}

function show(screen){
    landing.style.display = "none";
    lobby.style.display = "none";
    questionScreen.style.display = "none";
    leaderboard.style.display = "none";
    screen.style.display = "block";
}

connection.onerror =(event) =>{
    console.log(event);
    alert("there was an error. try refreshing the page. " + event);
}
connection.onopen = (event) =>{
    console.log(event)
}
connection.onclose = (event) =>{
    console.log(event)
    alert("Server Connection Closed. Try refreshing the page")
}

function enterGame(){
    let id = q("#gameIdInput").value
    let questions = q("#questions").value
    if(id == "" || questions==""){
        alert("Please enter a valid ID and questions")
        return;
    }
    connection.send(JSON.stringify({
        type:"host",
        id:id,
        questions:questions,
        showQuestionsOnClient:q("#showQuestionsOnPlayerScreens").checked
    }))
    q(".quizName").innerHTML = q("#quizNameInput").value
    
}

function nextQuestion(){
    connection.send(JSON.stringify({type:"nextQuestion"}))
    countdown = 3;
    countdownDisplay.innerHTML = 3;
    countdownDisplay.style.display = "block"
    questionInterval = setInterval(questionCountdown,1000)
}
function finishQuestion(){
    connection.send(JSON.stringify({type:"showAnswer"}))    
}
function showLeaderboard(){
    show(leaderboard)
}

function questionCountdown(){
    countdown = countdown -1;
    countdownDisplay.innerHTML = countdown;
    if(countdown == 0){
        clearInterval(questionInterval)
        connection.send(JSON.stringify({
            type:"showOptions"
        }))
        countdown = 20;
        answerInterval = setInterval(answerCountdown,1000)
    }
}
function answerCountdown(){
    countdown = countdown -1;
    countdownDisplay.innerHTML = countdown;
    if(countdown == 0){
        finishQuestion();
    }
}
