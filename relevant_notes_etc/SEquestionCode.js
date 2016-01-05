startGameServer();

function startGameServer() {

  handleLogins();
  

  clientsBuildLoginScreen();
  handleClientsLogin();

  function clientsBuildLoginScreen() {
    io.emit('build login screen');
  }
  
  function handleClientsLogin() {
    app.on('all login screens built' function() {
      readyForLoginCredentials = true;
      io.emit('ready for login credentials');
    });
  }

  // These are variables that multiple sockets need access to
  var readyForLoginCredentials = false;
  var numberOfSocketsWithBuiltLoginScreens = 0;
  function handleClientConnections() {
    io.on('connection', function(socket) {
    
      socket.on('login screen built', socketLoginScreenBuilt);

      function socketLoginScreenBuilt() {
        // See how I'm using this conditional to prevent sockets from triggering the important event logic after they've already triggered it once (since I set socket.loginBuilt to true in the logic
        if (!socket.loginBuilt) {
          numberOfSocketsWithBuiltLoginScreens++;
          socket.loginBuilt = true;

          if (numberOfSocketsWithBuiltLoginScreens === io.sockets.sockets.length) {
            app.emit('all login screens built')
          }
        }
      }

      socket.on('login credentials', socketLoginCredentials);
      
      function socketLoginCredentials(credentials) {
        if (readyForLoginCredentials) {
          socket.username = credentials.username;
          socket.password = credentials.password;
          
          socket.emit('user stored data', socket.userData);
        }
      }
    });
    
  }
  

}

// ------------------- OR -------------------

socket.on('login screen built', socketLoginScreenBuilt);

function socketLoginScreenBuilt() {
  // Notice how I'm not using a conditional here because I remove the 'login screen built' listener after this function is first ran. In that way I'll be certain that a socket won't trigger the important event logic multiple times
  numberOfSocketsWithBuiltLoginScreens++;
  socket.loginBuilt = true;

  if (numberOfSocketsWithBuiltLoginScreens === io.sockets.sockets.length) {
    app.emit('all login screens built')
  }
  
  socket.removeListener('login screen built', socketLoginScreenBuilt);
}

socket.on('login credentials', socketLoginCredentials);

function socketLoginCredentials(credentials) {

  socket.username = credentials.username;
  socket.password = credentials.password;

  socket.emit('user stored data', socket.userData);
  
  socket.removeListener('login credentials', socketLoginCredentials);
}

