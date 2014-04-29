define(['services/session', 'services/datacontext', 'plugins/router'], function (session, datacontext, router) {

	var player = ko.observable();
	var map = ko.observable();
	var gameInput = ko.observable();
	var isOpening = ko.observable();
	var isSearching = ko.observable();
	var isBuyingHP = ko.observable();
	var isBuyingMagic = ko.observable();
	var isWielding = ko.observable();
	var isLoading = ko.observable();
	var instructions = [
		'U,D,L,R - MOVE',
		'2 - OPEN DOOR',
		'3 - SEARCH (TRAPS, DOORS)',
		'4 - SWITCH WEAPON',
		'5 - FIGHT',
		'7 - SAVE GAME',
		'8 - USE MAGIC',
		'9 - BUY MAGIC',
		'10 - LOAD DUNGEON',
		'11 - BUY HP',
		'0 - PASS;'
	];
	var gameMessage = ko.observable('WHICH DUNGEON # ');
	var focusGameInput = ko.observable(false);

	function activate() {
		player(session.currentPlayer());
		// Go get the current map
		if (!player()) {			
			return router.navigate('');
		}
		//datacontext.getMap(map, 2);
		createPlayerOnMap();
	}

	var compositionComplete = function () {
		focusGameInput(true);
	};

	var purchase = {
		activate: activate,
		compositionComplete: compositionComplete,
		enterCommand: enterCommand,
		focusGameInput: focusGameInput,
		gameInput: gameInput,
		instructions: instructions,
		gameMessage: gameMessage,
		map: map,
		player: player
	};
	return purchase;

	function enterCommand() {
		var thisInput = gameInput().toLowerCase();
		console.log(!map());
		if (isWielding()) {
			var thisInt = parseInt(thisInput);
			if (!isNaN(thisInt)) {
				var thisWeapon = player().weapons()[thisInt - 1];
				if (thisWeapon) {
					player().weapon(thisWeapon);
					gameMessage('YOU HAVE EQUIPPED A ' + thisWeapon.name());
				} else {
					gameMessage('SORRY YOU DONT HAVE THAT WEAPON');
				}
				gameInput(null);
				isWielding(false);
			}
		}
		else if (!map() || isLoading()) {
			console.log('NO MAP!');
			datacontext.getMap(map, thisInput);
			createPlayerOnMap();
			isLoading(false);
		}
		else if (thisInput === 'right' || thisInput === 'r') {
			gameInput(null);
			moveRight();
		}
		else if (thisInput === 'left' || thisInput === 'l') {
			gameInput(null);
			moveLeft();
		}
		else if (thisInput === 'up' || thisInput === 'u') {
			gameInput(null);
			moveUp();
		}
		else if (thisInput === 'down' || thisInput === 'd') {
			gameInput(null);
			moveDown();
		}
		else if (thisInput === '2' || thisInput === 'open') {
			gameInput(null);
			openDoor();
		} 
		else if (thisInput === '3' || thisInput === 'search') {
			gameInput(null);
			search();
		}
		else if (thisInput === '4' || thisInput === 'wield') {
			gameInput(null);
			wield();
		}
		else if (thisInput === '5' || thisInput === 'fight') {
			gameInput(null);
			fight();
		}
		else if (thisInput === '7' || thisInput === 'save') {
			gameInput(null);
			save();
		}
		else if (thisInput === '8' || thisInput === 'cast') {
			gameInput(null);
			useMagic();
		}
		else if (thisInput === '9' || thisInput === 'buy magic') {
			gameInput(null);
			buyMagic();
		}
		else if (thisInput === '10' || thisInput === 'load') {
			gameInput(null);
			loadDungeon(thisInput);
		}
		else if (thisInput === '11' || thisInput === 'buy hp') {
			gameInput(null);
			buyHP();
		}
		else if (thisInput === '0' || thisInput === 'pass') {
			gameInput(null);
			pass();
		}
		else {
			gameMessage('COME ON');
			gameInput(null);
		}
	}

	function createPlayerOnMap() {
		if (map()) {
			var startPosition = datacontext.findPlayerStart(map().id());
			datacontext.createPlayerPosition(player(), startPosition.x(), startPosition.y());
			if (player()) {
				var currentPosition = player().position();
				var thisTile = datacontext.getTileByCoord(null, currentPosition.x(), currentPosition.y(), map().id());
				if (thisTile) {
					thisTile.image('U');
					thisTile.occupied(true);
				}
			}	
		}
	}

	function moveUp() {
		var currentPosition = player().position();
		movePlayer(currentPosition.x(), currentPosition.y() - 1);
	}

	function moveDown() {
		var currentPosition = player().position();
		movePlayer(currentPosition.x(), currentPosition.y() + 1);
	}

	function moveRight() {
		var currentPosition = player().position();
		movePlayer(currentPosition.x() + 1, currentPosition.y());
	}

	function openDoor() {
		// Ask which door to open
		gameMessage("DOOR LEFT RIGHT UP OR DOWN");
		isOpening(true);
	}

	function save() {
		datacontext.saveMapsAndTiles();
	}

	function search() {
		// Ask which door to open
		gameMessage("SEARCH.........SEARCH.........SEARCH.........");
		isSearching(true);
	}

	function useMagic() {
		// Ask which door to open
		gameMessage("MAGIC");
		if (player().weapon()) {
			setTimeout(gameMessage("YOU CANT USE MAGIC WITH WEAPON IN HAND"), 100);
		} else {
			setTimeout(gameMessage("YOU CANT USE MAGIC WITH WEAPON IN HAND"), 100);
		}
	}

	function buyMagic() {
		// Ask which door to open
		if (player().classType().name() === 'FIGHTER') {
			setTimeout(gameMessage("YOU CANT BUY ANY"), 100);
		} else {
			// else ask it what to buy or something
			setTimeout(gameMessage("BUY WHICH"), 100);
			isBuyingMagic(true);
		}
	}

	function buyHP() {
		// Ask how much HP
		gameMessage("HOW MANY 200 GP. EACH");
		isBuyingHP(true);
	}

	function fight() {
		// Ask what to fight
		gameMessage("YOUR WEAPON IS " + player().weapon().name());
		setTimeout(function () {
			// Get enemy name
			setTimeout(gameMessage("GOBLIN"), 100);
			setTimeout(gameMessage("HP=26"), 100);
			setTimeout(gameMessage("SWING"), 100);
			setTimeout(gameMessage("HE IS OUT OF RANGE"), 100);
		}, 200);
		isSearching(true);
	}

	function loadDungeon() {
		isLoading(true);
		gameMessage("ENTER DUNGEON #");
	}

	function wield() {
		// Ask which weapon to hold
		gameMessage("WHICH WEAPON WILL YOU HOLD, NUM OF WEAPON");
		isWielding(true);
	}

	function moveLeft() {
		var currentPosition = player().position();
		movePlayer(currentPosition.x() - 1, currentPosition.y());
	}

	function movePlayer(newX, newY) {
		if (player()) {
			var currentPosition = player().position();
			var oldTile = datacontext.getTileByCoord(null, currentPosition.x(), currentPosition.y(), map().id());
			var newTile = datacontext.getTileByCoord(null, newX, newY, map().id());
			// Check for obstruction
			if (newTile) {
				if (!checkIfOccupied(newTile)) {
					clearTile(oldTile);
					checkForItem(newTile);
					occupyTile(newTile);
				}
			}
		}
	}

	function checkForItem(tile) {
		if (tile.item() && tile.item().name()) {
			var thisItem = tile.item();
			gameMessage('FOUND A ' + thisItem.name() + ' ITEM!');
			tile.item().id(null);
			tile.item().name(null);
			tile.item().value(null);
			if (thisItem.value()) {
				player().gold(player().gold() + thisItem.value());
			}
		} else {
			gameMessage('ENTER COMMAND');
		}
	}

	function checkIfOccupied (tile) {
		return tile.occupied();
	}

	function clearTile (tile) {
		tile.occupied(false);
		tile.image(" ");
	}

	function occupyTile (tile) {
		tile.occupied(true);
		tile.image("U");
		player().position().x(tile.x());
		player().position().y(tile.y());
	}
});