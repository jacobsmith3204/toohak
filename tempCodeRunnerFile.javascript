
class Player {
  constructor(game){

    game.requestTHING();
  }
}

class Game {
  requestTHING(){
    console.log("requesting thing");
  }
}



var game = new Game();
new Player(game);