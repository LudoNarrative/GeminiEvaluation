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

		// *** Initial Cygnus file ***
		"game_1" : "../games/beach_a1.lp"

	}

	/*
	shim: {
		"jQueryUI": {
			export: "$",
			deps: ["jQuery"]
		}
	}*/

});

requirejs(
	["Phaser","AspPhaserGenerator","text!initialPhaserFile","text!game_1",
	"text!HealthBar","text!State","text!Condition","text!Display","text!StoryAssembler",
	"jQuery"],
	function (Phaser, AspPhaserGenerator, initialPhaserFile, game_1,
		HealthBar, State, Condition, Display, StoryAssembler) {

	var gameFile = game_1;
	loadPage();
	loadGame(gameFile);

	document.getElementById("input").onchange = function(e) { openFile(e) };

	function loadPage () {

		// Check URL params: "?a=1" or "a=2" for study 1 or 2
		var urlParams = new URLSearchParams(window.location.search);

		console.log ("urlParams:", urlParams);
		console.log("group:",urlParams.get('a')); // true

		// TODO: if order doesn't yet exist in local storage,
		// select random order, store it in local storage, 
		// Call loadGame() with first game

		// If order does exist, check gameCounter to decide which game to load next

	}

	function loadGame (gameFile) {

		initTimer();

		var aspGameFile  = gameFile.split("==========")[0];
	
		// Compile Cygnus .lp files into Phaser code
		//var generator = AspPhaserGenerator.AspPhaserGenerator (aspGameFile,initialPhaserFile);
		//var phaserProgram = AspPhaserGenerator.generate (generator.cygnusBrain, generator.initialPhaserBrain, true);
		var phaserProgram = AspPhaserGenerator.compile (aspGameFile, initialPhaserFile, true);
	
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

	}

	function endGame () {

		// Slowly fade out the game container and destroy the current game
		$(".container").fadeOut(2000, function() {
			if ( game !== "undefined") {
				game.destroy();
			}
		});

		// TODO: Replace with end screen and button to progress to the next survey

	}

	function initTimer() {

		var time = 180; // 180 = 3 min, 300 = 5 min

		var displayText = document.querySelector('#time'),
			timer = new CountDownTimer(time), // in seconds
        	timeObj = CountDownTimer.parse(time);

        format(timeObj.minutes, timeObj.seconds);
    
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

	    // Format time left to display in timer html
	    function format(minutes, seconds) {
        	seconds = seconds < 10 ? "0" + seconds : seconds;
        	displayText.textContent = minutes + ':' + seconds;
    	}

	}

	// Called when the file chooser form input is submitted
	function openFile (event) {
	    var input = event.target;
	
	    var reader = new FileReader();
	
	    reader.onload = function() {
	
	        var contents = reader.result;

			// Destroy the current game
	       	if ( game !== "undefined") {
				game.destroy();
			}

			// Remove current instructions
			//$("#instructions").empty();

	        loadGame (contents);
	
	    };
	
	    reader.readAsText(input.files[0]);
	}



});

