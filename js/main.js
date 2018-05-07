requirejs.config({
	paths: {

		"text" : "../lib/text", // Needed for loading text resources like JSON files via RequireJS. Uses 'text!' prefix.
		"Phaser" : "../lib/phaser",
		"jQuery": "../lib/jquery-3.0.0.min",
		//"jQueryUI": "../lib/jquery-ui.min",

		"AspPhaserGenerator" : "../asp-phaser-generator-2/index",
		"translateAsp" : "../asp-phaser-generator-2/src/asp-to-cygnus-2",
		"rensa" : "../asp-phaser-generator-2/src/brain",
		"ctp" : "../asp-phaser-generator-2/src/cygnus-to-phaser-brain-2",
		"translatePhaserBrain" : "../asp-phaser-generator-2/src/phaser-brain-to-code-2",

		"initialPhaserFile" : "../asp-phaser-generator-2/src/initial-phaser-file.json",

		"HealthBar" : "../lib/healthbarstandalone.js", // Needed for generated Phaser games that use HealthBar class
		"State" : "./State.js", // From StoryAssembler/. Needed because generated Phaser games reference Story Assembler's State object
		"Condition" : "./Condition.js", // From StoryAssembler/. Needed by State.js
		"Display" : "./Display.js", // Dummy version of the one from ClimateChange/js/. Referenced by the generated Phaser games. 
		"StoryAssembler" : "./StoryAssembler.js", // Dummy version of StoryAssembler for Phaser to reference

	}

});

requirejs(
	["Phaser","AspPhaserGenerator","text!initialPhaserFile",
	"text!HealthBar","text!State","text!Condition","text!Display","text!StoryAssembler",
	"jQuery"],
	function (Phaser, AspPhaserGenerator, initialPhaserFile,
		HealthBar, State, Condition, Display, StoryAssembler) {


	// Mapping of game IDs used by studyGroupMap to game filenames 
	var gameFileMap = 
		{
			0 : "games/lecture_scrubMode_a1.lp", 
			1 : "games/lecture_scrubMode_a2.lp", 
			2 : "games/beach_a1.lp",

			3 : "games/lecture_dodge_b1.lp", 
			4 : "games/beach_a2.lp",
			5 : "games/beach_b1.lp"
		};

	// Mapping of study group IDs to the set of games participants will play
	var studyGroupMap = 
		{
			0 : [0,1,2],
			1 : [3,4,5]
		};

	var userID;
	var gameset = []; // Stores indices into gameFileMap array
	var currentGameFile, currentGameID;
	var restart = 0; // Number of times this user has restarted on this game
	var time, timer, timeElapsed;

	$("#endscreen").fadeOut(0);

	loadPage();
	updateGameCount(); 
	
	document.getElementById("gear").onclick = function(e) { clearCache(); };

	/*
	 * Assign participant to a group and order if they haven't been assigned already.
	 * Store in localStorage. Load the next game. 
	 */
	function loadPage () {

		// Check if user has been assigned a study group yet
		if (localStorage.getItem("userID")) { 

			console.log (localStorage.getItem("studyGroupID"),
						 "\n gameSet: [", localStorage.getItem("game0"),
						 				  localStorage.getItem("game1"),
						 				  localStorage.getItem("game2"), "]");

		} else {

			// Generate unique user ID
			// Via https://gist.github.com/gordonbrander/2230317
			userID = Math.random().toString(36).substr(2, 9);

			localStorage.setItem("userID",userID);

			// Assign user a random study group (0 or 1)
			localStorage.setItem("studyGroupID", getRandomID()); 

			// Assign user a random order of games from their study group's gameset
			gameset = shuffle (studyGroupMap [localStorage.getItem("studyGroupID")] );

			// Store the chosen order in local storage (localStorage doesn't accept arrays)
			localStorage.setItem("game0", gameset[0]); 
			localStorage.setItem("game1", gameset[1]);
			localStorage.setItem("game2", gameset[2]);

			// Initialize the counter of games played by this user (ranges 0-2)
			localStorage.setItem("currentGameCount", 0);

			console.log ("No study group ID. Assign:",localStorage.getItem("studyGroupID"),
						 "\n gameset 0:", gameset);

		}

		var currentGameCount = localStorage.getItem("currentGameCount");
		currentGameID = parseInt( localStorage.getItem("game"+currentGameCount) ); 
		currentGameFile = gameFileMap[currentGameID];

		if (currentGameCount == 0) {
			showIntro(openFile(currentGameFile));
		} else {
			loadGame(openFile(currentGameFile));
		}
	}

	function showIntro (gameFile) {

		if (localStorage.getItem("finishedPreSurvey")) {

			$("#presurvey").fadeOut();
			$("#intro1").fadeIn(500);
	
			document.getElementById("intro1-next").onclick = function() {
				$("#intro1").fadeOut(500, function () {
					$("#intro2").fadeIn(500, function () {
						$("#instructions").fadeIn(500);
					});
				});
	
				document.getElementById("intro2-next").onclick = function() {
					$("#intro2").fadeOut(500, function() {
						loadGame(gameFile); 
					})
				};
	
			};
	
		} else {

			$("#presurvey").fadeIn(500);

			// Just pass the userID to presurvey
			var urlParams = "?user=" + localStorage.getItem("userID");

			localStorage.setItem("finishedPreSurvey",true);

			document.getElementById("presurvey-next").onclick = function() {
				window.location.href = "http://www.surveygizmo.com/s3/4325482/ResGen-Spring-2018-Pre-Survey" + 
					urlParams;
			}
		}

	}

	function updateGameCount () {
		document.getElementById("gamecount").textContent = 
			parseInt(localStorage.getItem("currentGameCount"))+1;
	}

	function clearCache () {
		localStorage.clear();
	}

	// Return random choice between 0 or 1
	function getRandomID () {
		return Math.floor(Math.random() * 2);
	}


	// The Fisher-Yates (aka Knuth) Shuffle
	// Via https://github.com/Daplie/knuth-shuffle
	function shuffle(array) {
		var currentIndex = array.length, temporaryValue, randomIndex;
	
		// While there remain elements to shuffle...
	  	while (0 !== currentIndex) {
	
	    	// Pick a remaining element...
	    	randomIndex = Math.floor(Math.random() * currentIndex);
	    	currentIndex -= 1;
	
	    	// And swap it with the current element.
	    	temporaryValue = array[currentIndex];
	    	array[currentIndex] = array[randomIndex];
	    	array[randomIndex] = temporaryValue;
	  	}
	
	  	return array;
	}

	function loadGame (gameFile) {

		initTimer();

		// Make sure instructions and game container (goal, game, and restart button) are visible
		$("#instructions").fadeIn();
		$("#game-container").fadeIn();
		$("#restart-container").fadeIn();

		var aspGameFile  = gameFile.split("==========")[0];
		var goal = gameFile.split("==========")[1];

		document.getElementById("goaltext").textContent = goal;
	
		// Compile Cygnus .lp files into Phaser code
		//var generator = AspPhaserGenerator.AspPhaserGenerator (aspGameFile,initialPhaserFile);
		//var phaserProgram = AspPhaserGenerator.generate (generator.cygnusBrain, generator.initialPhaserBrain, true);
		var phaserProgram = AspPhaserGenerator.compile (aspGameFile, initialPhaserFile, false);
	
		/* Phaser Game Constructor: new Game(width, height, renderer, parent, state, transparent, antialias, physicsConfig);
		 * Creates a canvas element
		 */
		phaserProgram = 
			"game = new Phaser.Game(500, 400, Phaser.AUTO, 'game', { preload: preload, create: create, update: update }, true);"
			+ Display
			+ StoryAssembler
			+ phaserProgram
			+ HealthBar
			+ Condition
			+ State;
	
		eval(phaserProgram);
		
		//console.log ("FINISHED PHASER PROGRAM:\n", phaserProgram);

		// Add listeners to restart and done buttons
		document.getElementById("restart").onclick = function() { restartGame(); };
		document.getElementById("done").onclick = function() { 

			// Todo: pause timer while waiting for a response
			//timer.pause();
			if ( confirm("Are you sure you want to stop playing this game? You won't have a chance to return to it later.") ) {
				endGame(); 
			}
			//timer.resume();

		};

	}

	function endGame () {

		// Generate URL parameters to pass to survey site: 
		// group ID, game ID, participant ID, game count
		var urlParams = "?user=" 	  + localStorage.getItem("userID") + 
						"&group="	  + localStorage.getItem("studyGroupID") +
						"&game="  	  + currentGameID +
						"&rcount="	  + restart + 
						"&t="		  + timeElapsed + 
						"&gamecount=" + (parseInt(localStorage.getItem("currentGameCount"))+1) // ranges 1-3
						;

		console.log("URL params to pass to survey:", urlParams);

		console.log("time left:",document.getElementById("time").textContent, 
					"timeElapsed:", timeElapsed);

		// Slowly fade out the game container and destroy the current game
		$(".container").fadeOut(2000, function() {
			if ( game !== "undefined") {
				game.destroy();
			}
		});

		$("#timer").fadeOut(2000);
		
		// Replace game with end screen and button to progress to the next survey
		$("#instructions").fadeOut(2000, function () {
			$("#endscreen").fadeIn(500);
		});

		// Increment or reset counter of games played by this user
		// If user has already played 3 games, reset counter to 0
		var previousGameCount = parseInt(localStorage.getItem("currentGameCount"));
		var nextGameCount = previousGameCount >= 2 ? 0 : previousGameCount+1;
		localStorage.setItem("currentGameCount", nextGameCount);	

		// Forward user to survey page when they click 'next'
		document.getElementById("next").onclick = function() { 
			window.location.href = "https://www.surveygizmo.com/s3/4331932/ResGen-Spring-2018-Post-Survey" + urlParams;
		};	

	}

	function restartGame() {
		restart += 1;
		this.game.state.restart();
	}

	function initTimer() {

		$("#timer").fadeIn();

		time = 300; // 180 = 3 min, 300 = 5 min
		var totalTime = CountDownTimer.parse(time);
		var displayText = document.querySelector('#time');

		// Global timer object
		timer = new CountDownTimer(time); // in seconds

		// Initialize the display with 5:00
        format(totalTime.minutes, totalTime.seconds);
    
    	// Run a couple functions on every tick
	    timer.onTick(format)
	    timer.onTick(checkExpired);
	    timer.start();

	    // End game if timer is done
	    function checkExpired() {
	    	if (this.expired()) {
	    		endGame();
	    	}
	    }

	    // Format time left to display in timer html and update global variable
	    function format(minutes, seconds) {
	    	
	    	seconds = seconds < 10 ? "0" + seconds : seconds;
        	displayText.textContent =  minutes + ':' + seconds;

        	timeElapsed = time - (minutes*60 + seconds);
    	}

	}

	function openFile (filename) {

		var request = new XMLHttpRequest();
		request.open('GET', filename, false);
		request.send();
		var fileContent = request.responseText;

		return fileContent;

	}

	// Called when the file chooser form input is submitted
	function openFileReader (event) {
	    var input = event.target;
	
	    var reader = new FileReader();
	
	    reader.onload = function() {
	
	        var contents = reader.result;

			// Destroy the current game
	       	if ( game !== "undefined") {
				game.destroy();
			}

	        loadGame (contents);
	
	    };
	
	    reader.readAsText(input.files[0]);
	}

});

