// script designed to be run to get the questions from a kahoot and write down the questions and answers 
// updated for v2 format
// USAGE: find a list of questions on kahoot. go to the page and click "Show all" to see all the answers.
// then use ctrl shift i to open the inspector. click on the "console" tab, and paste this script in
// the questions will be outputted to the console in correct format for the kahoot game.



var list = [];
// gets all the visible questions
document.querySelectorAll("li").forEach(e=>{    
        if(e["className"].indexOf("question") != -1){
            list.push(e);
            console.log("found", e);
        }
    });

var result = "";
for (var item of list){
    var newline = ""
    var remaining = 4; 
    // gets the text within the questions, splits it into its lines
    var obj = item.innerText.split('\n');


    var type = obj[0].replace(/\d+\s-\s/g, "").toLowerCase();
    switch(type){
        case "slide": 
            console.log("not a question:",obj);
        break; 
        case "quiz":
            var answers = []; 
            console.log(item.querySelector('div[aria-label$="image"]')); 

            for(var j = 1, i = 3; i < obj.length; i++, j++){
                console.log(item.querySelector(`div[aria-label^="Option ${j}"]`)); 
                answers.push(obj[i]);
            }
            console.log("found a question: \n",obj[1], answers);
            
        break;
        case "slider": 
            console.log("can't do sliders", obj);
        break; 
        case "puzzle": 
            console.log("can't do puzzles", obj);
        break; 
        default:
            console.log("couldn't do", obj);
        break;
    }


    newline+= item.innerText; 



    //console.log(item.innerText);


    var alist = item.querySelectorAll(".choices__choice")
    for(var answer of alist){
        var newanswer = answer.children[0].children[1].innerHTML
        newline += "\t" + newanswer; // add answers to result
        if(answer.querySelector(".choices__choice--correct") != null){
            // this is a "correct" answer option
            newline += "\ty"
        } else {
            newline += "\tn"
        }
        remaining--;
    }
    // add extra tabs for the ones that should be remaining
    for(var i = remaining; i > 0;i--){
        newline += "\t\t";
    }
    // get the image and add the url to the end of the thing
    let imagediv = item.querySelector(".background-image")
    if(imagediv != null){
        image = imagediv.style.backgroundImage
        console.log(image)
        image = image.substr(image.indexOf('"')+1)
        console.log(image)
        image = image.substr(0,image.indexOf('&width'))
        console.log(image)
        newline += "\t" + image
    }
    if(remaining <= 2) // there had to be at least 2 answers
        result+=newline+"\n"
}
console.log(result);
    
        