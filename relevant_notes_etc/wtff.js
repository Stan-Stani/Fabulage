// Many of the comments and logic in this and associated files are inspired by or copied from socket.io/get-started/chat/ and more from their website.

// ! Global Variables Section !
var express = require('express');
var app = express();

var favicon = require('serve-favicon');

app.use(favicon(__dirname + '/public/images/favicon.ico'));

var fs = require('fs');

// wraps http server in socket.io ?
var http = require('http').Server(app);

var options = {
  key: fs.readFileSync('auth/key.pem'),
  cert: fs.readFileSync('auth/cert.pem')
};

var https = require('https').Server(options, app);







// The main idea behind Socket.IO is that you can send and receive any events you want, with any data you want. Any objects that can be encoded as JSON will do, and binary data is supported too.
// Notice that I initialize a new instance of socket.io by passing the http (the HTTP server) object
// Used to be:
// io = require('socket.io')(http);

// But since I'm now using http AND https I don't create a new instance by passing http only, I create the instance and then attach the servers.
var ioRequire = require('socket.io');
var io = new ioRequire

io.attach(http);
io.attach(https);


// Sets nL to system specific newline character. In Unix like systems it's "\n" but in Windows it's "\n\r".
var nL = require('os').EOL;
// ! End of Global Variables Section !

// ! Central Function Calls Section !
// These are the central functions of the program. They should be completely independent of each other.
startServingContent();
handleClientConnects();
handleServerShutdown();
//handleServerError();
// ! End of Central Function Calls Section !

// ! Central Functions' Definitions Section !

// Handles inital page request and assets requested by that page
function startServingContent() {
  // when there is an http request to specified path (/), the res object gets sent as http response.
  app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
  }); 


  /* sets up static server. Will serve exact paths to assets. Example path: localhost:3000/assets/Yahhoo.wav.
  Without the static server no assets on host machine are accessible by the app. */
  app.use(express.static(__dirname + '/public'));
  


  // Finishes serving initialization by starting server listening
  var httpPort = 80;
  http.listen(httpPort, function(){
    console.log('http server listening on ' + httpPort.toString());
  });
  
  var httpsPort = 443;
  https.listen(httpsPort, function() {
    console.log('https server listening on ' + httpsPort.toString());
  });
};

// 404 Page
app.use(function(req, res, next) {
  res.sendFile(__dirname + '/public/404/404.html');
});


var userList = [];
var gameStarted = false;
var everybodyInHasAlreadyBeenClicked = false;
var gameStartTimer;
var answerPool = [];
// Handles initial client connection and data interchange between server and client after that
function handleClientConnects() {
  var fabFactoids = JSON.parse(fs.readFileSync(__dirname + '/game_files/fib_factoids.json'))
  
  // Event listener, runs callback function on a client (socket) connnection event that handles/takes care of this specific client connection
  io.on('connection', function(socket) {
    var username;
    
    socket.emit('logged in users', userList);
    if (gameStarted) {
      socket.emit('game state', 'game already started');
      console.log('game already started');
    } else {
      socket.emit('game state', 'game not yet started');
    }
    
  

    // Does stuff when this client disconnects
    socket.on('disconnect', function () {
      // If the user has logged in before they disconnect
      if (username !== undefined) {
        console.log(username + ' disconnected');
        io.emit('player disconnected', username);
        
        // Remove user from user list.
        for (var i = 0; i < userList.length; i++) {
          if (userList[i] === username) {
            userList.splice(i, 1);
          }
        }
      }
    });
    
    
    
    var roomCode, username;
    // Does stuff when client submits log in info.
    socket.on('login', function(credentials) {
      
      // If credentials are null (i.e. if this client hasn't already logged in ((to prevent username change hacks during the game))
      console.log(username)
      if (roomCode === undefined && username === undefined) {

        
        // If the user has the correct Room Code
        if (credentials.roomCode.toUpperCase() === "DOGE".toUpperCase()) {
          
          if (credentials.username === '') {
            var invalidName = true;
            socket.emit('username can\'t be blank');
            console.log('wannabe user "' + credentials.username + '" submitted invalid username "' + credentials.username + '"');
          }
          
          for (var i = 0; i < userList.length; i++) {
            if (userList[i] === credentials.username) {
              var invalidName = true;
              socket.emit('name already exists');
              console.log('wannabe user "' + credentials.username + '" tried to log in with name that already exists: "' + credentials.username + '"');
            }
          }
          
          if (!invalidName) {
            var loginTime = new Date();
            userList.push(credentials.username);
            io.emit('new player', credentials.username);
            socket.username = username = credentials.username
            roomCode = credentials.roomCode
            socket.emit('login successful');
            console.log('"' + username + '" logged in successfully');
          }
        } else { 
          socket.emit('invalid room code')
          console.log('wannabe user "' + username + '" submitted invalid room code: "' + credentials.roomCode + '"');
        }

      } else {
        socket.emit('username already set', username);
      }
    });
    
    socket.on('wait! everybody\'s not in!', function() {
      clearTimeout(gameStartTimer);
      if (!gameStarted) {
        io.emit('game start cancelled so stop timer');
        socket.broadcast.emit('game start cancelled so change button');
        console.log('game start cancelled');
        everybodyInHasAlreadyBeenClicked = false;
      }
    });
    
    
    socket.on("everybody's in", function() {
      
      // If the game hasn't started yet (prevents clients from somehow 'everybody's in' command after game has started and prevents game from being started multiple times in multiple socket instances); Everybodyinhasalready etc prevents multiple timers from being started.
      if (!gameStarted && !everybodyInHasAlreadyBeenClicked) {
        everybodyInHasAlreadyBeenClicked = true;
        socket.broadcast.emit('game starting soon so change button');
        io.emit('game starting soon so start timer');
        
        
        gameStartTimer = setTimeout(function() {
          clientsStartGame();
        }, 3250);
      }
    });
    
    function clientsStartGame() {
      gameStarted = true;
      for (var i = 0; i < io.sockets.sockets.length; i++) {
        console.log(io.sockets.sockets[i].username);
        if (io.sockets.sockets[i].username) {
          io.sockets.sockets[i].emit('initialize game');
        }
        
        // Send 'game already started' to all clients
        // Only noticeably affects clients that aren't users (clients without usernames)
        if (io.sockets.sockets[i]) {
          io.emit('game state', 'game already started');
        }
      }
      console.log('game started');
      
      
      
    };
    
    socket.on('client game logic initiated', function() {
      // Right now I'm thinking of users as clients who have entered a username and joined the player list.
      socket.gameInitialized = true;
      var connectedClients = io.sockets.connected
      var clients = io.sockets.sockets;
      var numberOfUsersWithInitiatedGames = 0;
      var numberOfUsers = 0;
      for (var i = 0; i < io.sockets.sockets.length; i++) {
        // Wait for other clients to initialize their games
        // Generates number of users with initiated game.
        // If client has initiated game and they have set their username increment numberOfUsersWithInitiatedGames
        
        if (clients[i].gameInitialized === true && clients[i].username) {
          numberOfUsersWithInitiatedGames ++;
          // All sockets have initialized their games, so we can send the factoid
        }
        
        // Generates number of users (clients with usernames)
        // If client has username increment number of uesrs
        if (clients[i].username) {
          numberOfUsers ++;
        }
        
        
      }
      
      // If all users have have initiated their games, we can start sending game data
        console.log(numberOfUsersWithInitiatedGames + ' users have initialized their games. Waiting for ' + (numberOfUsers - numberOfUsersWithInitiatedGames) + ' more users to initialize...');
        // If all users have finished game initialization (this only gets called on the last socket to initialize so that's why I'm looping through all the sockets inside it to apply the 'answer submission' event listener. If I didn't then only the last socket would react to that event.
        if (numberOfUsers === numberOfUsersWithInitiatedGames) {
          console.log('All users have initialized the game');
          
          handleFactoidLogic();
          
          function handleFactoidLogic() {
            var randomIndex = Math.floor(Math.random() * fabFactoids.normal.length);
            var randFactoid = fabFactoids.normal[randomIndex];
            
            console.log((randFactoid.question));
          
            io.emit('new factoid', randFactoid.question);
            
            // Add these events to all the clients
            for (var i = 0; i < io.sockets.sockets.length; i++) {
              console.log('before function i: ' + i);
              io.sockets.sockets[i].on('answer submission', function(answer) {
                console.log('in function i: ' + i);
                // TODO: Set this and other instances of io.soc-etc. to variable defined outside of for loop.
                console.log('i inside function: ' + i);
                var socket = io.sockets.sockets[i];
                if (!socket.currentAnswer) {
                  console.log(answer);
                  socket.currentAnswer = answer;
                  answerPool.push(answer);

                  var currentClients = io.sockets.sockets;
                  var numberOfCurrentUsers = 0;
                  var numberOfAnsweredCurrentUsers = 0;
                  for (var i = 0; i < currentClients.length; i++) {
                   if (currentClients[i].username) {
                      numberOfCurrentUsers ++;
                    }

                    // If the currentClient is a user and has submitted an answer for this session
                    if (currentClients[i].username && currentClients[i].currentAnswer) {
                      numberOfAnsweredCurrentUsers ++;
                    }

                    // If all the users have submitted their answers
                    if (numberOfAnsweredCurrentUsers === numberOfCurrentUsers) {
                      socket.emit('answer pool', answerPool)
                    }
                  }
                }
              });
            }
          }
        }
    });
    
  });
  
  
  // This function is used to tell all clients, the console, the log, and the connection log the state of the client (as described by a string argument)
  // E.G. given that stateChangeDescriptor = 'disconnected', this function will cause a printing of '<example ip> disconnected' to
  // all clients, the console, and the log. 
  function registerClientState(socket, stateChangeDescriptor, userName) {
    if (userName) {
      var textToRegister = userName + " " + stateChangeDescriptor;
      } else {
        var textToRegister = socket.handshake.address + " " + stateChangeDescriptor;
      };
    io.emit('chat message', textToRegister);
    console.log(textToRegister);
    fs.appendFile(__dirname + '/log/log.txt', textToRegister + nL, function(err) {
      if (err) throw err;
    });
    fs.readFile(__dirname + '/log/connection_log.txt', function(err, data) {
      if (err && err.code === 'ENOENT') {
        fs.writeFile(__dirname + '/log/connection_log.txt', textToRegister + ' on ' + new Date + nL, function(err) {
          if (err) throw err;
        });
      } else if (err) throw err;
      else {
        fs.appendFile(__dirname + '/log/connection_log.txt', textToRegister + ' on ' + new Date + nL, function(err) {
          if (err) throw err;
        });
      }
    });
    // Started implementing user list. TODO: Finish.
    io.emit('user connection state change', {userName: userName, status: 'connected'})
  };
};



function handleServerShutdown() {
  // if it's inside the connection event listener when server is shut down as many times as the connection was ever initiated will be how many times alertServerShutdown() runs.
  // catch ctrl+c event and exit normally
  // (Don't exit the server by clicking the X button of the terminal. Use 'Ctrl + C'! If you don't the 'Warning: Server hutting down!' message won't be sent.)
  process.on('SIGINT', function (code) {
    alertServerShutdown();
    setTimeout(function() {process.exit(2)}, 1000);
    
    function alertServerShutdown() {
    var msg = 'Warning: Server shutting down!';
    io.emit("chat message", msg);
    console.log(msg);
    }
  });
};


function handleServerError() {
//catches uncaught exceptions
    process.on('uncaughtException', function(ev) {
      io.emit('chat message', 'Warning: Server error! You may become disconnected soon or features may no longer work!')
      console.log(ev);
    });
};

// ! End of Central Functions' Definitions Section !



