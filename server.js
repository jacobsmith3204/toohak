"use strict"
console.log("starting... NEW")
// http server dependencies  
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
// game socket server dependencies 
const WebSocket = require('ws');
const {Game} = require('./game.js'); 



const PORT = 8000;
const SOCKETPORT = 8001;
const FILE_DIR = path.join(__dirname, 'static'); // Directory to stored game files



// starts a simple file server
const server = http.createServer(handleFileServerRequests);
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/index.html`);
});
console.log("Started file server")



// starts the socket server 
const wss = new WebSocket.Server({
    port:SOCKETPORT
});
console.log("Started Websocket server")

// sends all socket connections to the game file to establish a connection to a game
wss.on('connection', stream => { 
	console.log("established connection to new server");
	Game.establishConnection(stream);
});




// handles the file server requests
function handleFileServerRequests(req, res){
	const parsedUrl = url.parse(req.url, true);
    const filePath = path.join(FILE_DIR, parsedUrl.pathname.substring(1)); // Remove leading "/"
	// 
	console.log(parsedUrl, filePath);

	switch(req.method){
		case 'GET': 
			HandleGet(); 
		break; 
		case 'POST' : 
			HandlePost();
		break;
		default: 
			HandleExceptions(); 
		break;

		// 
		function HandleGet(){
			console.log("using method: " , req.method);
			fs.readFile(filePath, (err, data) => {
        	    if (err) {
        	        res.writeHead(404, { 'Content-Type': 'text/plain' });
        	        res.end('File not found');
					console.log("couldn't find file: " , filePath);
        	    } else {	
        	        res.writeHead(200, { 'Content-Type': GetContentType()});
        	        res.end(data);
					console.log("sent file: " , filePath, "with headers",  GetContentType());
        	    }
        	});
		}
		// 
		function HandleExceptions(){
			console.log("couldn't handle" , req.method);
			res.writeHead(405, { 'Content-Type': 'text/plain' });
        	res.end('Method Not Allowed');
		}
		// 
		function SimpleResponse(){
			res.writeHead(200, { 'Content-Type': 'text/plain' });
    		res.end('Hello, World!\n');
		}
		// 
		function HandlePost(){
				
			/*
				 // Write data to file
				 let body = '';
				 req.on('data', chunk => {
					 body += chunk;
				 });
	
				 req.on('end', () => {
					 fs.writeFile(filePath, body, err => {
						 if (err) {
							 res.writeHead(500, { 'Content-Type': 'text/plain' });
							 res.end('Error writing file');
						 } else {
							 res.writeHead(200, { 'Content-Type': 'text/plain' });
							 res.end('File saved');
						 }
					 });
				 });
				 
			*/
		}

		// helper function to send the right response headers based on the content
		function GetContentType(){
			let match = filePath.match(/\.[\w.]+$/)[0]; // gets the file extention matches extentions with 2 "." just need to add it as a case
			//console.log(match);
			switch(match){
				case ".html": return 'text/html; charset=UTF-8'; 
				default: return 'text/plain';  
			}
		}
	}
}


module.exports = {wss};