// script designed to be run to get the questions from a kahoot and write down the questions and answers 
// updated for v2 format
// USAGE: find a list of questions on kahoot. go to the page and click "Show all" to see all the answers.
// then use ctrl shift i to open the inspector. click on the "console" tab, and paste this script in
// the questions will be outputted to the console in correct format for the kahoot game.



var list = document.querySelectorAll(".question-list__item")
var result = "";
for (var item of list){
    var newline = ""
    var remaining = 4; 
    newline+= item.querySelector(".question-media__text-inner-wrapper").children[0].innerHTML// add question to result
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
    
        