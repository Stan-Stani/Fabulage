//TODO: Prevent clients from loggin in when a game is running.
//TODO: BUG: Server will get locked into a game if last user leaves while game is running game start timer
//TODO: BUG: Players can join the game when the button says game in progress when the game has ended. This is possible because the button doesn't update itself if the game has ended unless the screen is refreshed. The game will even start and include such players. This bug is just confusing for the user. "Why can I join a game if it is in progress?" Answer: It's not really in progress the button just doesn't update itself. The game has finished since you loaded the page but the button only tells you that a game was in progress when you originally loaded the page.


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
  var httpPort = 1337;
  http.listen(httpPort, function(){
    console.log('http server listening on ' + httpPort.toString());
  });
  
  var httpsPort = 1338;
  https.listen(httpsPort, function() {
    console.log('https server listening on ' + httpsPort.toString());
  });
  
  // 404 Page
  // Essentially the last middleware indicating that nothing else is to be done / nothing else responded. cf. http://expressjs.com/en/starter/faq.html
  app.use(function(req, res, next) {
    res.sendFile(__dirname + '/public/404/404.html');
  });
};




// Variables that are shared between sockets
var userList = [];
var gameStarted = false;
var everybodyInHasAlreadyBeenClicked = false;
var gameStartTimer;
var randFactoid;
var submittedAnswerPoolAndCorrect = [];
var numberOfUsersDoneSelecting = 0;
var selectedAnswerDataPool = [];
// Handles initial client connection and data interchange between server and client after that
function handleClientConnects() {
//  var fabFactoids = JSON.parse(fs.readFileSync(__dirname + '/game_files/fibbage/fib_factoids.json'))

// copiedVerbatim status is meant to fulfill the Creative Commons Attribution-ShareAlike 3.0 License requirement of indicating changes.
  var fabFactoids = JSON.parse(fs.readFileSync(__dirname + '/game_files/my_factoids/fab_factoids.json'))
  
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
        
        // Remove this listener so only one listener of this type is ever active (When a socket connects this listener is added, so if it weren't removed when the socket disconnects the listener would still exist. (If the listener were attached to the socket emitter I would not have to manually remove it because the socket's event listeners are removed automatically when the socket disconnects. But this event is added to the app emitter which doesn't lose its event listeners when a socket disconnects even if the listeners were added because of a socket connection event.
        app.removeListener('listen for answer submission', listenForAnswerSubmission);
        
        // See app.removeListener('listen for answer submission', listenForAnswerSubmission) comment
        app.removeListener('handle answer selection', appHandleAnswerSelection);
        
        // End game if no users are left in game (this will probably result in a buggy next game: may need to clear all these variables when a user joins and also remove some event listeners) 
        console.log('Users left in game after most recent disconnect (happened @ ' + new Date + '): ' + tabulateSockets('users').length);
        if (tabulateSockets('users').length === 0) {
            
         
          // Reset these variables for the next question
          submittedAnswerPoolAndCorrect = [];
          numberOfUsersDoneSelecting = 0;
          selectedAnswerDataPool = [];

          // Resets user game state variables
          tabulateSockets('users').forEach(function(currentValue, index, array) {
            array[index].submittedAnswer = undefined;
            array[index].alreadySelectedAnswer = undefined
            
             // TODO: This is only a short term solution to managing event listeners on sockets after they disconnect and reconnect. Eventually I'll have to have a better way to remove only the relevant listeners etc.
          // Removes all event listeners from all users after the last user disconnects
            currentValue.removeAllListeners
        
          });
          
          gameStarted = false;
          console.log('gameStarted = ' + gameStarted);
          everybodyInHasAlreadyBeenClicked = false;
        }
      }
      
    });
    
    
    
    var roomCode, username;
    // Does stuff when client submits log in info.
    socket.on('login', function(credentials) {
      
      // If credentials are null (i.e. if this client hasn't already logged in ((to prevent username change hacks during the game)), and the game isn't running
      if (roomCode === undefined && username === undefined && !gameStarted) {

        
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
          console.log('wannabe user "' + credentials.username + '" submitted invalid room code: "' + credentials.roomCode + '"');
        }

      } else {
        socket.emit('username already set', username);
      }
    });
    
    socket.on('wait! everybody\'s not in!', function() {
      clearTimeout(gameStartTimer);
      if (!gameStarted) {
        io.emit('game start cancelled so stop timer');
        socket.emit('game start cancelled so change button');
        console.log('game start cancelled');
        everybodyInHasAlreadyBeenClicked = false;
      }
    });
    
    
    socket.on("everybody's in", function() {
      
      // If the game hasn't started yet (prevents clients from somehow 'everybody's in' command after game has started and prevents game from being started multiple times in multiple socket instances); Everybodyinhasalready etc prevents multiple timers from being started and there is at least one user
      if (!gameStarted && !everybodyInHasAlreadyBeenClicked && (tabulateSockets('users').length !== 0)) {
        everybodyInHasAlreadyBeenClicked = true;
        socket.emit('game starting soon so change button');
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
          
          
        }
    });
    
    app.on('handle answer selection', appHandleAnswerSelection);
    
    function appHandleAnswerSelection() {

      socket.on('selected answer', clientSelectedAnswer);
      
      function clientSelectedAnswer(selectedAnswer) {
        if (!socket.alreadySelectedAnswer) {
          numberOfUsersDoneSelecting++;
          console.log('answer selected: ' + selectedAnswer);
          var usersWhoSubmittedSelectedAnswer = []
          // Determines which users submitted the answer that THIS user has just selected
          tabulateSockets('users').forEach(function(currentValue, index, array) {
            if (selectedAnswer === currentValue.submittedAnswer) {
              usersWhoSubmittedSelectedAnswer.push(currentValue.username);
            }
          });
          var answerData = {usersWhoSubmittedSelectedAnswer: usersWhoSubmittedSelectedAnswer, selectedAnswer: selectedAnswer, selectingUser: socket.username}
          selectedAnswerDataPool.push(answerData);
          console.log(tabulateSockets('users').length +'"'+ numberOfUsersDoneSelecting);
          // If this is the last socket that needs to select an answer
          if (tabulateSockets('users').length === numberOfUsersDoneSelecting) {
            var allAnswerData = {selectedAnswerDataPool: selectedAnswerDataPool, correct: randFactoid.answer, citationInfo: randFactoid.citationInfo};
            io.emit('all answer data', allAnswerData);
            // Reinit numberOfUsersDoneSelecting etc. for next time
            numberOfUsersDoneSelecting = 0;
            selectedAnswerDataPool = [];
            console.log('limit twixe?');
            function factoidLoopFinishedEvent() {
              app.emit('factoidLoopFinished');
            }
            // Time that the results of the factoid loop is displayed is a function of (and relatively proportional to) the number of players
            var timeBetweenFactoidLoops = (tabulateSockets('users').length * 1000) + 4000;
            setTimeout(factoidLoopFinishedEvent, timeBetweenFactoidLoops);
            console.log('Time between factoid loops: ' + timeBetweenFactoidLoops);
            socket.alreadySelectedAnswer = true;
          }
        }
        // Remove this listener from the socket so it can only select (as far as the server is concerned) the first answer it clicks
        socket.removeListener('selected answer', clientSelectedAnswer);
      }
      
      
    }
    
    app.on('listen for answer submission', listenForAnswerSubmission)
    
    function listenForAnswerSubmission() {
      if (socket.username) {
        socket.on('answer submission', answerSubmissionParentFunction);
        console.log('ADDED ANSWER SUBMISSION LISTENER. Here are the number of those listeners currently added to this socket: (socket username:' + socket.username + ') ' + socket.listeners('answer submission', answerSubmissionParentFunction).length);
      }
      
      
      // TODO: Change this to list the username of the clients where the listeners were started if possible. There is a bug where 2 more listeners for answer submission listeners than necessary are active after the first game.
      console.log('number of listen for answer submission listeners' + app.listeners('listen for answer submission', answerSubmissionParentFunction).length);
    }
    
    function answerSubmissionParentFunction(answer) {
      answerSubmissionLogic(answer);
      console.log('answer submitted !!!!!: ' + answer);
    }

    function answerSubmissionLogic(answer) {
      var currentSocket = socket;
      // Prevents server from hanging on this factoidLoop because empty string is falsey.
      if (answer === '') {
        answer = '<strong style="color: black;">(Didn\'t submit an answer!)</strong>';
        
      }
      console.log('answer submission logic invoked');
      // Conditional prevents client from resubmitting answer
      console.log('CURRENT ANSWER SHOULDN\'T BE DEFINED AND ITS VALUE IS: ' + currentSocket.submittedAnswer);
      if (!currentSocket.submittedAnswer) {
        currentSocket.submittedAnswer = answer;
        submittedAnswerPoolAndCorrect.push(answer);

        var currentClients = io.sockets.sockets;
        var numberOfCurrentUsers = 0;
        var numberOfAnsweredCurrentUsers = 0;
        for (var k = 0; k < currentClients.length; k++) {
         if (currentClients[k].username) {
            numberOfCurrentUsers ++;
          }

          // If the currentClient is a user and has submitted an answer for this session
          if (currentClients[k].username && currentClients[k].submittedAnswer) {
            numberOfAnsweredCurrentUsers ++;
          }
        }

          // If all the users have submitted their answers
          if (numberOfAnsweredCurrentUsers === numberOfCurrentUsers) {


            // add correct answer and then shuffle
            submittedAnswerPoolAndCorrect.push(randFactoid.answer);
            submittedAnswerPoolAndCorrect = shuffle(submittedAnswerPoolAndCorrect);

            io.emit('answer pool', submittedAnswerPoolAndCorrect)
            console.log('emmiting pool');

            // Get's us the F*** out of this crazy nesting. I'll need to clean all this up someday.
            app.emit('handle answer selection');

            

          }
          
          // Get rid of the answer submission listeners inside this monstrous nesting.
            console.log('FOR: ' + currentSocket.username);
            console.log('listeners bef remov:' + currentSocket.listeners('answer submission'));
              currentSocket.removeListener('answer submission', answerSubmissionParentFunction);
            console.log('listeners aft remov:' + currentSocket.listeners('answer submission'));
        console.log('answer submission logic finished');
      }
    }
    
    
    
    
  });
  
  function handleFactoidLogic() {
    var randomFactoidIndex =  randomIndex(fabFactoids.normal);
    randFactoid = fabFactoids.normal[randomFactoidIndex];

    console.log((randFactoid.question));

    io.emit('new factoid', randFactoid.question);

    app.emit('listen for answer submission');
  }
  
  
  
  
  
  // Can't be in socket or there will be an event listener for every socket connect. TODO check if handle answer selection has same problem
  app.on('factoidLoopFinished', function() {
  
    // Reset these variables for the next question
    submittedAnswerPoolAndCorrect = [];
    numberOfUsersDoneSelecting = 0;
    selectedAnswerDataPool = [];
    
    // Resets user game state variables
    tabulateSockets('users').forEach(function(element, index, array) {
      array[index].submittedAnswer = undefined;
      array[index].alreadySelectedAnswer = undefined
    });
    io.emit('prepare for new factoid');
    handleFactoidLogic();
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

// Src: http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    // Apparently it's important that the first element not be started on
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function randomIndex(array) {
  return Math.floor(Math.random() * array.length);
}

//TODO: Use and apply this in areas where it will shorten code
function tabulateSockets(request) {
  var connectedClients = io.sockets.sockets;
  var connectedUsers = [];
  for (var i = 0; i < connectedClients.length; i++) {
    if (connectedClients[i].username) {
      connectedUsers.push(connectedClients[i]);
    }
  }

  if (request === 'clients') {
    return connectedClients;
  } else if (request === 'users') {
    return connectedUsers;
  }
}


