// Why 'in function i: undefined' when is i instead?

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
                  for (var k = 0; k < currentClients.length; k++) {
                   if (currentClients[k].username) {
                      numberOfCurrentUsers ++;
                    }

                    // If the currentClient is a user and has submitted an answer for this session
                    if (currentClients[k].username && currentClients[k].currentAnswer) {
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