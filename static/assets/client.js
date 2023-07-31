var connection = new WebSocket("wss://letsgo.hs.vc/node/toohak/");
var question, ans,score,scoreChange,placing,behind,image;
var correctSound, incorrectSound;
var mainScreen,loginScreen,lobby,resultsScreen;

function q(sel){return document.querySelector(sel)}

window.onload = ()=>{
    question = q(".question");
    ans = q(".answers");
    score = q(".score")
    placing = q(".placing")
    behind = q(".behind")
    correctSound = new sound("assets/correct.mp3");
    incorrectSound = new sound("assets/incorrect.mp3")
    mainScreen = q(".main")
    loginScreen = q(".login")
    lobby = q(".lobby")
    resultsScreen = q(".results")
    image = q(".image")
    scoreChange = q(".scoreChange")
}
function sound(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    this.play = function(){
      this.sound.play();
    }
    this.stop = function(){
      this.sound.pause();
    }
  } 

connection.onmessage = (event)=>{
    let data = JSON.parse(event.data)
    console.log(data);
    switch(data.type){
        case "message":
            alert(data.value)
            break;
        case "enterGame" :
            show(lobby);
            break;
        case "kick":
            show(loginScreen)
            alert(data.reason)
            break;
        case "question":
            // when given a question to show
            show(mainScreen)
            question.innerHTML = data.question;
            image.style.display = "none";
            for( let c of ans.children){
                c.style.display = "none"
            }
            break;
        case "answerText":
            // when giving answers (full answer text) to show
            ans.style.display = "flex"
            for(let i = 0; i < 4; i++){
                if(i >= data.answers.length){
                    ans.children[i].style.display = "none"
                } else{
                    ans.children[i].style.display = "block"
                    ans.children[i].innerHTML = data.answers[i]
                }
            }
            if(data.image == undefined){
                image.style.display = "none"
            } else {
                image.style.display = "block"
                image.src = data.image
            }
            break;
        case "answerCount":
            // when just giving number of answers (e.g 3 answers for question) and question and answer  text is displayed on hostz screen
            show(mainScreen)
            image.style.display = "none"
            ans.style.display = "flex"
            for(let i = 0; i < 4; i++){
                if(i >= data.answerCount){
                    ans.children[i].style.display = "none"
                } else{
                    ans.children[i].style.display = "block"
                    ans.children[i].innerHTML = i+1;
                }
            }
            break;
        case "qFinished":
            // question finished
            ans.style.display = "none"
            show(resultsScreen)
            if(data.correct){
                resultsScreen.style.backgroundColor = "mediumseagreen"
                correctSound.play();
            } else {
                resultsScreen.style.backgroundColor = "red"
                incorrectSound.play();
            }
            score.innerHTML = data.score;
            scoreChange.innerHTML =data.scoreChange;
            if(data.gameOver){
                q(".name").innerHTML = "Good Game!"
                q(".leaveBtn").style.display = "block"
            } else q(".leaveBtn").style.display = "none"
            break;
        case "placingUpdate":
            behind.innerHTML = data.behind;
            placing.innerHTML = data.place;
            break;
        default:
            console.warn(data.type + " is not yet implemented")
    }
        
}
function show(screen){
    loginScreen.style.display = "none"
    mainScreen.style.display = "none"
    lobby.style.display = "none"
    resultsScreen.style.display = "none"
    screen.style.display = "block"
    // enable key press listners only if on mainscreen
    if(screen == mainScreen){
        keyPressListener = window.addEventListener("keypress",keyPress)
    } else {
        if (keyPressListener != undefined) window.removeEventListener(keyPressListener);
    }
}

connection.onerror =(event) =>{
    console.log(event);
    alert("there was an error. try refreshing the page. " + event);
}
connection.onopen = (event) =>{
    console.log(event)
}

function enterGame(){
    let id = q("#gameIdInput").value
    let nickname = q("#nicknameInput").value
    if(id == "" || nickname==""){
        alert("Please enter a valid ID and nickname")
        return;
    }
    q(".name").innerHTML = nickname
    connection.send(JSON.stringify({
        type:"join",
        id:id,
        name:nickname,
    }))
}
function checkAnswer(myAnswer){
    ans.style.display = "none"
    connection.send(JSON.stringify({
        type:"answer",
        answer:parseInt( myAnswer.value)
    }))
}

var keyPressListener;
// add support for u, i, j, and k keys to answer questions
function keyPress(e){
    ans.style.display = "none"
    switch(e.key){
        case "u":
            connection.send(JSON.stringify({
                type:"answer",
                answer:0
            }))
            break;
        case "i":
            connection.send(JSON.stringify({
                type:"answer",
                answer:1
            }))
            break;
        case "j":
            if(ans.children[2].style.display != "none")
                connection.send(JSON.stringify({
                    type:"answer",
                    answer:2
                }))
            break;
        case "k":
            if(ans.children[3].style.display != "none")
                connection.send(JSON.stringify({
                    type:"answer",
                    answer:3
                }))
            break;
    }
}