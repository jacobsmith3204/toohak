// script designed to be run to get the questions from a kahoot and write down the questions and answers 
// updated for v2 format
// USAGE: find a list of questions on kahoot. go to the page and click "Show all" to see all the answers.
// then use ctrl shift i to open the inspector. click on the "console" tab, and paste this script in
// the questions will be outputted to the console in correct format for the kahoot game.


var result = [];

// gets all the visible questions ( <li> thats class starts with "question" ) 
var list = document.querySelectorAll('li[class^="question"]');
for (var element of list) {
    // gets the text within the questions, splits it into its lines
    var item = element.innerText.split('\n'); 
    var type = item[0].replace(/\d+\s-\s/g, "").toLowerCase();
    
    switch (type) {
        case "slide":
            ExtractSlideData(element,item);
            break;
        case "quiz":
            var obj = ExtractQuizData(element, item);
            appendToResult(obj);
            console.log("found a question: \n", obj);
            break;
        case "slider":
            ExtractSliderData(element.item);
            break;
        case "puzzle":
            ExtractPuzzleData(element,item);
            break;
        default:
            console.log("failed to do: ", item);
            break;
    }
}
console.log(resultToString());



function appendToResult(obj){
    result.push(obj);
}

function resultToString(){
    var string = "";
    console.log(result);

    result.forEach(obj => {
        console.log(obj);
        string += `${obj["title"]}\t`; 

        obj["options"].forEach(option=> {
            //console.log(option);
            string += `${ option["option"]}\t${option["result"]}\t`; 
        });

        string += `${obj["imageURL"]}\n`; 
    });
    return string;    
}

  /*
    // quiz formatted as follows 
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


function ExtractSlideData(element,item){
    console.log("not a question:", item);
}

function ExtractQuizData(element, item){
    // extracts and formats the data into an object 
    var imageElement = element.querySelector('div[aria-label$="image"]');
    console.log(imageElement);

    // extracts the options
    var options = []
    for (var j = 1, i = 3; i < item.length; i++, j++) {
        // gets the correct option element (finding it from the parent <li> so need j to tell us what number we are looking for)
        var optionElement = element.querySelector(`div[aria-label^="Option ${j}"]`);
        // reads the end of the aria-label for the result 
        var str = optionElement["ariaLabel"];
        var result = str.substring(str.lastIndexOf(' ') + 1);
        console.log(optionElement, result);
        // pushes the result to the options array so we have everything in a nice list
        options.push({ option: item[i], result: result });
    }
    
     // returns the created quiz object
    return {
        type : "quiz",
        title: item[1],  //the question
        imageURL : imageElement["title"], //image url is on the title field of the element(for some reason)
        options: options
    }; 
}

function ExtractSliderData(element, item){
    console.log("can't do sliders", item);
}

function ExtractPuzzleData(element,item){
    console.log("can't do puzzles", item);
}


