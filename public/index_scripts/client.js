// ! Global Variables Section !


// Establishes connection to Server (defaults to connecting to host that served page so no URL required in argument)
var socket = io();

var chatForm = document.getElementById("chat-form");
var chatFormInput = document.getElementById("chat-form-input");
var current_client_saved_username;
var connectedUsers = [];



// ! Global Objects Section !

/* Don't be confused by this object. Right now it is only a means to storing certain phrases formatted around document.cookie. 
E.g. cookiesInfo.printConsoleChange doesn't do anything to figure out if the cookies have changed at some point. It only prints
document.cookie with a different phrase at the beginning. Evenutally, adding logic for only printing the cookies that have changed
since the last cookiesInfo.printConsoleChange might be helpful. */
var cookiesInfo = {
  printConsoleBeforeScriptLoad: function() {console.log('Existing cookies before script loads: ' + '"' + document.cookie + '"')},
  printConsoleCurrent: function() {console.log('Current Cookies:  ' + '"' + document.cookie + '"')},
  printConsoleChange: function() {console.log('Cookie change, Current Cookies:  ' + '"' + document.cookie + '"')}
};

// ! End of Global Objects Section !
// ! End of Global Variables Section !

cookiesInfo.printConsoleBeforeScriptLoad();

// ! Central Function Calls Section !
// These are the central functions of the program. They should be completely independent of each other. That is, they don't need each other to exist to work.

/*loadMuteState();
handleMuteToggle('toggle-mute');*/
//loadUsername();

handleServerEmits();
handleClientEmits();
//fadeOutWelcome();
// ! End of Central Function Calls Section !

// ! Central Functions' Definitions Section !

// TODO: PREVENT XSS!

// On page load, reads the 'mute-status' cookie which has the mute state of chat sounds from the last session and applies that cookie to the 'toggle-mute' button and manageSound()
function loadMuteState() {
  var button = document.getElementById('toggle-mute');
  var keyValuePairs = document.cookie.split(/; */);
  for(var i = 0; i < keyValuePairs.length; i++) {
    var name = keyValuePairs[i].substring(0, keyValuePairs[i].indexOf('='));
    var value = keyValuePairs[i].substring(keyValuePairs[i].indexOf('=')+1);
    if (name === 'mute-status' && value === 'muted') {
      manageSound.muteAll = true;
      button.innerHTML = 'Turn Sound On';
    } 
    else if (name === 'mute-status' && value === 'not-muted') {
      manageSound.muteAll = false;
      button.innerHTML = 'Turn Sound Off';
    }
  }
}

// On mute button click, toggles the appearance of 'toggle-mute', toggles true/false value of manageSound.muteAll, and toggles the mute-status cookie
function handleMuteToggle(buttonId) {

  button = document.getElementById(buttonId);
  button.addEventListener('click', function(ev) {toggleMute(button)});

  function toggleMute(button) {
    // If manageSound has been explicitly muted, then unmute it.
    // Eventually need to put the contained cookie creation code in a funciton as it's used twice.
    if (manageSound.muteAll) {
      manageSound.muteAll = false;
      button.innerHTML = 'Turn Sound Off';
      // creates/re-creates cookie, setting it to expire 183 days from its creation/re-cretion date.
      // http://stackoverflow.com/questions/3818193/how-to-add-number-of-days-to-todays-date
      var expDate = new Date();
      var numberOfDaysToAdd = 183;
      var cookies = document.cookie;
      expDate.setDate(expDate.getDate() + numberOfDaysToAdd);  
      setCookie('mute-status', 'not-muted', expDate);
      cookiesInfo.printConsoleChange();
      // Easy way to delete cookie
      // document.cookie = 'cook' + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    /* If manageSound.muteAll has been explicitly set to false, or has not been defined yet, mute.
      (Because manageSound() only mutes if its muteAll property has been set to true, there
      could be a case where muteAll has not been defined and we would want to mute on toggle if that's true.
      Basically if muteAll has not been defined (if user hasn't ever clicked toggle button) we want to default to not muting, but mute on toggle.) */
    else {
      manageSound.muteAll = true;
      button.innerHTML = 'Turn Sound On'
      // See above
      var expDate = new Date();
      var numberOfDaysToAdd = 183;
      var cookies = document.cookie;
      expDate.setDate(expDate.getDate() + numberOfDaysToAdd);  
      setCookie('mute-status', 'muted', expDate);
      cookiesInfo.printConsoleChange();
    }

  }
}

// Note that if client loses connnection and reconnects it is not automatically set to resubmit its username which it will need to do to have its name.
// ^ That has been hack/fixed but will need refactoring.
// Right now if that happened the user would need to refresh or manually re-enter their username to submit it.
function loadUsername() {
  var button = document.getElementById('username');
  var keyValuePairs = document.cookie.split(/; */);
  for(var i = 0; i < keyValuePairs.length; i++) {
    var name = keyValuePairs[i].substring(0, keyValuePairs[i].indexOf('='));
    var value = keyValuePairs[i].substring(keyValuePairs[i].indexOf('=')+1);
    if (name && name === 'username') {
      // decodeURI undoes cookies automatic encoding of special characters to URL codes. This allows the original characters to be usd as the username and 
      // will thus let usernames be executed as HTML. 
      socket.emit('username submit', decodeURI(value));
      // allows username submission on reconnect.
      current_client_saved_username = decodeURI(value);
    }
  }
};

// This should probably be moved to handleClientEmits
function handleSetUsername() {
  var button = document.getElementById('join-button');
  var invalidCredentialsDisplay = document.getElementById('invalid-credentials-message-display');
  
  button.addEventListener('click', function () {
    invalidCredentialsDisplay.innerHTML = '';
    var usernameInput = document.getElementById('username-input').value;
    var roomCodeInput = document.getElementById('room-code-input').value;
    var credentials = {username: usernameInput, roomCode: roomCodeInput};
    socket.emit('login', credentials);
  });
  
  
  // innerWatcher must be defined out here as opposed to inside watchButtonAndForm because if it were in there every time the Change Username button is clicked innerWatcher would be redefined. If it were redefined every time, the removeEventListener('submit', innerWatcher); in the buttonState === 'changing' conditional would be attempting to remove an event listener with an instance of innerWatcher that has not been added to form, so no event listener would get removed in that case.
  
  function innerWatcher(ev){
      // ev.preventDefault(); prevents form from actually submitting and thus the page from refreshing (but the event listener still fires)
      ev.preventDefault();
      console.log(ev);
      socket.emit('username submit', input.value);
      // see above
      current_client_saved_username = input.value;
      input.blur();
      form.classList.toggle('hidden');
      button.innerHTML = 'Change Username';
      buttonState = 'not changing';
      var expDate = new Date();
      var numberOfDaysToAdd = 183;
      var cookies = document.cookie;
      expDate.setDate(expDate.getDate() + numberOfDaysToAdd);  
      setCookie('username', input.value, expDate);
      cookiesInfo.printConsoleChange();
      input.value = "";
      form.removeEventListener('submit', innerWatcher);
      console.log('submit fired');
    };
};


// Tells the client user that their client has connected.
function alertClientConnect() {
  alertClient('Notice: Connection established!');
  var sound = document.getElementById('yahhoo');
  manageSound(sound);
}


//	var Notification = window.Notification || window.mozNotification || window.webkitNotification;
//
//	Notification.requestPermission(function (permission) {
//		console.log(permission);
//	});








var gameStartTimerNumberDisplay = document.getElementById('game-start-timer-number-display');
var gameStartTimerDisplay = document.getElementById('game-start-timer-display');
function updateGameStartTimerNumberDisplay(value) {
  gameStartTimerDisplay.style.display = 'block';
  gameStartTimerNumberDisplay.innerHTML = value;
  
  // If timer number is empty string then hide the whole timer display.
  
  if (value === '') {
    gameStartTimerDisplay.style.display = 'none';
  }
}
// Does things based off of the events emitted by the server
function handleServerEmits() {

  var joinedPlayersDisplay = document.getElementById('joined-players-display');
  var playerList = document.getElementById('player-list');
  
  socket.on('logged in users', function(userList) {
    for (var i = 0; i < userList.length; i++) {
      var li = document.createElement('li');
      li.innerHTML = userList[i];
      playerList.appendChild(li);
    }
    console.log(userList);
    
  });
  
  socket.on('game state', function(gameState) {
    if (gameState === 'game already started') {
      var button = document.getElementById('everybody-in-button');
      button.innerHTML = "Game In Progress! Come Back Later!"
      button.style.backgroundColor = '#e88511';
    } else if (gameState === 'game not yet started') {
      
    }
  });
  
  socket.on('new player', function(username) {
      var li = document.createElement('li');
      li.innerHTML = username;
      playerList.appendChild(li);
    });
  
  socket.on('player disconnected', function(username) {
    // Remove player from the playerlist ul.
    var list = playerList.getElementsByTagName('li');
    for (var i = 0; i < list.length; i++) {
      if (list[i].innerHTML === username) {
        list[i].parentElement.removeChild(list[i]);
      }
    }
  });
  
  socket.on('username already set', function(username) {
    console.log('You\'ve already chosen a user name. It\'s "' + username + '". Reload the page to reset it.');
  });
  
  handleInvalidCredentials();
  
  function handleInvalidCredentials() {
    var invalidCredentialsDisplay = document.getElementById('invalid-credentials-message-display');
    socket.on("username can't be blank", function() {
      invalidCredentialsDisplay.innerHTML = "Username can't be blank";
      console.log('Username can\'t be blank');
    });

    socket.on('name already exists', function() {
      invalidCredentialsDisplay.innerHTML = "Username exists already son";
      console.log('Username exists already son');
    });

    socket.on('invalid room code', function() {
      invalidCredentialsDisplay.innerHTML = "Invalid room code";
      console.log('Invalid room code');
    });
  }
  
  socket.on('game start cancelled so change button', function() {
    var button = document.getElementById('everybody-in-button');
    button.innerHTML = "Everybody's In!"
    button.style.backgroundColor = 'aqua';
  });
  
  var gameStartCountDown;
  socket.on('game start cancelled so stop timer', function() {
    if (gameStartCountDown) {
      clearInterval(gameStartCountDown);
      updateGameStartTimerNumberDisplay('');
      console.log('game start cancelled');
    }
  });
  
  socket.on('game starting soon so change button', function() {
    var button = document.getElementById('everybody-in-button');
    button.innerHTML = "Wait!"
    button.style.backgroundColor = 'red';
  });
  
  socket.on('game starting soon so start timer', function() {
    
    
    var secondsLeft = 3;
    console.log(secondsLeft);
    updateGameStartTimerNumberDisplay(secondsLeft)
    var localGameStartCountDown = gameStartCountDown = setInterval(function() {
      secondsLeft -= 1;
      if (secondsLeft > 0) {
        updateGameStartTimerNumberDisplay(secondsLeft)
        console.log(secondsLeft);
      } else {
        updateGameStartTimerNumberDisplay(secondsLeft)
        console.log(secondsLeft);
        // This allows interval to be cleared even if multiple people start timer at same time time and gameStartCountDown gets redefined to newest setInterval. Before when I only used gameStartCountDown if multiple people clicked "Everybody's in!" at the same time (or thereabouts) and then someone clicked "Wait" gameStartCountDown was only defined as the latest interval and so clearInterval would only clear the most recent intervals.
        clearInterval(localGameStartCountDown);
        // Displays 0 for 1 second. Anyonymous function allows argument to be passed to updageGameStartTimerDisplay.
        setTimeout(function() {updateGameStartTimerNumberDisplay('')}, 1000);
      }
    }, 1000);
    
  });
  
  socket.on('initialize game', function() {
    var body = document.getElementsByTagName('body')[0]
    body.innerHTML = '';
    
    loadInGamePageAndHandleGameLogic();
    // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
    // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/HTML_in_XMLHttpRequest
    function loadInGamePageAndHandleGameLogic() {
      
      // This function is executed when in_game_page is loaded.
      function reqListener() {
        var inGameDocument = this.responseXML
        
        body.innerHTML = inGameDocument.body.innerHTML;
        var sourceList = document.getElementById('source-list');
        // Load style form inGameDocument. Only use 1 style sheet in these documents and don't use inline styles to ensure the complete style from one page replaces the other!
        (document.getElementsByTagName('style')[0]).innerHTML = (inGameDocument.getElementsByTagName('style')[0]).innerHTML
        
        handleGameLogic();
        
        var factoidDisplay = document.getElementById('factoid-display');
        function handleGameLogic() {
          console.log('handling game logic');
          socket.on('new factoid', function(factoid) {
            factoidDisplay.innerHTML = (factoid.replace('<BLANK>','_______'));
          });
          
          var factoidSources = document.getElementById('factoid-sources');
          var factoidSourcesHeader = document.getElementById('factoid-sources-header');
          var factoidSourcesList = document.getElementById('source-list');
          
          handleFactoidSourcesAnimations();
          
          function handleFactoidSourcesAnimations() {
          //TODO: Add specific button that triggers opening and closing.
          factoidSourcesHeader.addEventListener('click', openFactoidSources);

            function openFactoidSources() {
              factoidSourcesHeader.removeEventListener('click', openFactoidSources);
              // Allows scrolling (if necessary) when factoid-sources is open
              factoidSourcesList.style.overflow = 'auto';
              factoidSources.classList.remove('factoid-sources-fly-down-animation');
              factoidSources.classList.add('factoid-sources-fly-up-animation'); 

              // Timeout waits for animation to finish
              setTimeout(setUpCloseFactoidSources, 600);


            }

            function setUpCloseFactoidSources() {
              factoidSourcesHeader.addEventListener('click', closeFactoidSources);
            }

            function closeFactoidSources() {
              factoidSourcesHeader.removeEventListener('click', closeFactoidSources);
              factoidSources.classList.remove('factoid-sources-fly-up-animation');
              factoidSources.classList.add('factoid-sources-fly-down-animation');
              // Timeout waits for animation to finish
              setTimeout(setUpOpenFactoidSources, 600);
            }

            function setUpOpenFactoidSources() {
              factoidSourcesList.style.overflow = 'hidden';
              factoidSourcesHeader.addEventListener('click', openFactoidSources);
            }
          
          }
            
          
          var awaitingAllPlayersSubmissionsIndicator = document.getElementById('awaiting-all-players-submissions-indicator');
          var userAnswerInputButton = document.getElementById('user-answer-input-button');
          var userAnswerInput = document.getElementById('user-answer-input');
          userAnswerInputButton.addEventListener('click', function () {
            socket.emit('answer submission', userAnswerInput.value)
            console.log('should be block')
            awaitingAllPlayersSubmissionsIndicator.style.display = 'block';
          });
          
          var userSubmitWrapper = document.getElementById('user-answer-submit-wrapper');
          var answerDisplay = document.getElementById('answer-display');
          socket.on('answer pool', function(answerPool) {
            console.log(answerPool);
            userSubmitWrapper.style.display = 'none'
            userAnswerInput.value = '';
            while (answerPool[0] !== undefined) {
              var button = document.createElement('button')
              button.innerHTML = answerPool.pop();
              button.setAttribute('type','button');
              button.className = 'answer-button';
              
              var textAlignWrapper = document.createElement('div');
              textAlignWrapper.className = 'text-align-wrapper';
              
              // Allows button to be captured
              addEventListenerToButton(button);
              
              function addEventListenerToButton(button) {
                console.log('button: ' + button.innerHTML);
                button.addEventListener('click', function(ev) {
                  socket.emit('selected answer', button.innerHTML);
                  awaitingAllPlayersSubmissionsIndicator.style.display = 'block';
                });
              }
              
              textAlignWrapper.appendChild(button);
              answerDisplay.appendChild(textAlignWrapper);
            
            }
            answerDisplay.style.display = "inline-block";
            awaitingAllPlayersSubmissionsIndicator.style.display = 'none';
          });
          
          socket.on('all answer data', function(allAnswerData) {
            console.log('selected answers received');
            var pickedExplanationDiv = document.createElement('div');
            pickedExplanationDiv.innerHTML = 'Answers players picked';
            var correctAnswerExplanationDiv = document.createElement('div');
            correctAnswerExplanationDiv.innerHTML = 'Correct answer';
            var correctAnswer = document.createElement('h3')
            correctAnswer.innerHTML = allAnswerData.correct;
            var ul = document.createElement('ul')
            for (var i = 0; i < allAnswerData.selectedAnswerDataPool.length; i++) {
             
            
              var usersWhoSubmittedAnswerText = buildUsersWhoSubmittedAnswerText();
              
              // Build the text that describes which users submitted this answer
              function buildUsersWhoSubmittedAnswerText() {
                var usersWhoSubmittedAnswerText;
               
               console.log('aaaaTH: ' + allAnswerData.selectedAnswerDataPool[i].usersWhoSubmittedSelectedAnswer);
               allAnswerData.selectedAnswerDataPool[i].usersWhoSubmittedSelectedAnswer.forEach(function(currentValue, index, array) {
                  // If this is the first user who submitted answer then add its name into usersWhoSubmittedAnswerText, else if the first answer has been added, place a comma and then add the next user
                  
                  if (!usersWhoSubmittedAnswerText) {
                    usersWhoSubmittedAnswerText = '(submitted by: ' + currentValue;
                  } else {
                    usersWhoSubmittedAnswerText += ', ' + currentValue
                  }
                  console.log('usersWhoSubmittedAnswer text: ' + usersWhoSubmittedAnswerText);
                });
                // If the array isn't empty finish formatting the text and return it, else it is empty and therefore there are no users who submitted this answer, i.e. it is a correct answer that nobody submitted, so just return an empty string.
                if (allAnswerData.selectedAnswerDataPool[i].usersWhoSubmittedSelectedAnswer[0]) {
                  usersWhoSubmittedAnswerText += ')'
                  return usersWhoSubmittedAnswerText;
                } else return '';
              }
            
              var li = document.createElement('li');
              var userPickedAnswerText = allAnswerData.selectedAnswerDataPool[i].selectingUser + ' picked: ' + allAnswerData.selectedAnswerDataPool[i].selectedAnswer;
              
              li.innerHTML = userPickedAnswerText + ' ' + usersWhoSubmittedAnswerText;
              console.log('HEEEEEY: ' + usersWhoSubmittedAnswerText);
              ul.appendChild(li);
            }
            answerDisplay.innerHTML = '';
            answerDisplay.appendChild(pickedExplanationDiv);
            answerDisplay.appendChild(ul);
            answerDisplay.appendChild(correctAnswerExplanationDiv);
            answerDisplay.appendChild(correctAnswer);
            awaitingAllPlayersSubmissionsIndicator.style.display = 'none';
            
            //Add citation info to sources list
            appendCitation();
            
            function appendCitation() {
              if (allAnswerData.citationInfo) {
                sourceList.innerHTML += '<li>' + allAnswerData.citationInfo.source + ' (copiedVerbatim? ' + allAnswerData.citationInfo.copiedVerbatim + ')</li>';
              } else {
                sourceList.innerHTML += '<li>(No Source)</li>'
              }
            }
          });
          
          socket.on('prepare for new factoid', function() {
            answerDisplay.innerHTML = '';
            answerDisplay.style.display = 'none';
            userSubmitWrapper.style.display = 'block';
          });
          
          socket.emit('client game logic initiated');
        }
        
      }

      var xhr = new XMLHttpRequest();
      // When the request response is received do reqListener;
      xhr.addEventListener("load", reqListener);
      
      xhr.open('GET', window.location.href + '/game_pages/in_game_page.html');
      xhr.responseType = 'document';
      xhr.send();
      
    }
    
    console.log('game started!');
  });
  
  socket.on('reconnect', function() {
    console.log(current_client_saved_username);
    if (current_client_saved_username) {
      socket.emit('username submit', current_client_saved_username);
    }
  });
  
  alertConnectionChanges();
  
  // Should eventually be split up between events that are acutally emitted by the server and events that the socket itself fires off
  function alertConnectionChanges() {
    socket.on('error', alertClientConnectionError);
    socket.on('disconnect', alertClientDisconnect);
    socket.on('reconnect', alertClientReconnect);
   
    function alertClientConnectionError() {
      alertClient('Warning: Connection Issues!');
      scrollMessagesDown();
    };
    
    function alertClientDisconnect() {
      alertClient('Warning: Disconnected!');
      scrollMessagesDown();
      var sound = document.getElementById('they-re-killing-me');
      manageSound(sound);
    };
    
    function alertClientReconnect() {
      alertClient('Notice: Connection restablished!')
      scrollMessagesDown();
      var sound = document.getElementById('yahhoo');
      manageSound(sound);
    };
  };
  
  // Shows notification to user at bottom right of screen, regardless of whether the tab or browser containing the client is up
  function createNotification(message) {
    
    var instance = new Notification(
        "Message", {
            body: message
        }
    );

    instance.onclick = function () {
        // Something to do
    };
    instance.onerror = function () {
        // Something to do
    };
    instance.onshow = function () {
        // Something to do
    };
    instance.onclose = function () {
        // Something to do
    };

    setTimeout(instance.close.bind(instance), 4000);

    return false;
  }
};

// Emits events to server based off of things that happen in the client
function handleClientEmits() {
  
  handleSetUsername();
  
  var button = document.getElementById('everybody-in-button');
  button.addEventListener('click', function () {
    if (button.innerHTML === "Everybody's In!") {
//      button.innerHTML = 'Wait!';
//      button.style.backgroundColor = 'red';
      socket.emit('everybody\'s in');
    } else if (button.innerHTML === 'Wait!') {
      socket.emit('wait! everybody\'s not in!');
//      button.innerHTML = "Everybody's In!";
//      button.style.backgroundColor = 'aqua';
    }
  });
  
};

// Removes welcome animation after fading it out after specified amount of time.
function fadeOutWelcome() {
  var welcomeAnim = document.getElementById('hover-page')
  setTimeout(function() {
    welcomeAnim.classList.add('fadeOut', 'animated');
    setTimeout(function() {document.body.removeChild(welcomeAnim)}, 1025);
  }, 5000);
}


// ! End of Central Functions' Definitions Section !

// ! Reusable Component Functions' Initilizations Section!
// Note that not all Reusable Component functions will have to be intialized and thus contained in this section.
handleBlurFocusEvents()
// ! End of Reusable Component Functions' Initilization Section!
// ! Reusable Component Functions' Definitions Section !
/* These are functions that are used (or will be used) in more than one Central Function (so they're defined once on the same level as the Central Functions as opposed to multiple times inside of the Central Functions). */

function getAllIndexesForString(str, regex) {
  var result, indices = [];
  while ( (result = regex.exec(str)) ) {
    indices.push(result.index);
  }
  return indices;
}


function getAllIndexes(arr, val) {
    var indexes = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
}

function setCookie(name, value, expDate) {
  //If expDate exists then convert to UTC format
  (expDate) && (expDate = expDate.toUTCString());
  // var c_value = encodeURI(value) +  (if expDate === undefined OR null return "" if it doesn't equal undefined OR null return "; expires=" + expDate);
  var c_value = encodeURI(value) + ((expDate === null || expDate === undefined) ? "" : "; expires=" + expDate);
  document.cookie = name + "=" + c_value;
};

function alertClient(msg) {
  console.log(msg);
};

// alertClient() might need a rename, and when I refactor I need to remove the scrollMessagesDown()s that are outside of the alertClients.
function scrollMessagesDown() {
  var objDiv = document.getElementById('message-container');
  objDiv.scrollTop = objDiv.scrollHeight;
}

function manageSound(sound) {
  if (manageSound.muteAll !== true) {
//    sound.play();
  } else {
    console.log(sound.getAttribute('id') + ' is muted');
  }
}

// Need to rename to take account of .onBlur
function handleBlurFocusEvents() {
  // Unsafe use as it will be overwritten if I ever need a function somewhere else to happen on blur/focus
  var windowBlurred = false;
  window.onblur = function() { handleBlurFocusEvents.windowBlurred = true;
                              console.log('window is blurred');
                             };
  window.onfocus = function() { handleBlurFocusEvents.windowBlurred = false;
                              console.log('window is focused');
                              };
  

  
}


// ! End of Reusable Component Functions' Definitions Section !

