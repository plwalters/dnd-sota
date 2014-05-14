define(['services/datacontext'], function (datacontext) {

	function createMap(thisMap) {
		var thisLayout = thisMap.layout;
		var xvar = 1;
		var yvar = 1;
		var itemId = 1;
		var enemyOrder = 1;
		for (var i = 0; i < thisLayout.length; i++) {
			var thisTile = thisLayout.charAt(i);
			if (thisTile === '*') {
				// Create a wall
				datacontext.createEntity('Tile', { name: 'Tile', mapId: thisMap.id, occupied: true, x: xvar, y: yvar, image: "*" } );
				xvar += 1;
			} else if (thisTile === '.') {
				// Create an empty tile
				datacontext.createEntity('Tile', { name: 'Tile', mapId: thisMap.id, occupied: false, x: xvar, y: yvar, image: " " } );
				xvar += 1;
			} else if (thisTile === 'U') {
				// Create a player start tile
				datacontext.createEntity('Tile', { name: 'Tile', mapId: thisMap.id, occupied: true, x: xvar, y: yvar, image: "U" } );
				xvar += 1;
			} else if (thisTile === '$') {
				// Create a player start tile
				var thisGoldValue = makeRandom(50, 500);
				var thisTile = datacontext.createEntity('Tile', { name: 'Tile', mapId: thisMap.id, occupied: false, x: xvar, y: yvar, image: "$" } );
	        	var thisTileItem = datacontext.createComplexType('TileItem', { id: itemId, name: "GOLD", value: thisGoldValue });
	        	thisTile.item(thisTileItem);
	        	itemId += 1;
				xvar += 1;
			} else if (thisTile === 'M' || thisTile === 'G' || thisTile === 'T' || thisTile === 'S' || thisTile === 'B' || thisTile === 'J' || thisTile === 'O' || thisTile === 'N' || thisTile === 'N') {
				// Create an enemy start tile that is empty until the enemy is spawned
				var thisTileSpecifically = datacontext.createEntity('Tile', { name: 'Tile', mapId: thisMap.id, occupied: false, x: xvar, y: yvar, image: " ", enemySpawnOrder: enemyOrder, enemySpawnType: thisTile } );
				// Don't create the enemy on spawn, let the game do that
	        	// var thisTileEnemy = datacontext.createComplexType('TileEnemy', { id: enemyOrder, name: "GOBLIN", hitPoints: 10, damage: 2 });
	        	// thisTile.enemy(thisTileEnemy);
	        	enemyOrder += 1;
				xvar += 1;
			} else if (thisTile === 'D') {
				// Create an door start tile
				var thisTile = datacontext.createEntity('Tile', { name: 'Tile', mapId: thisMap.id, occupied: true, x: xvar, y: yvar, image: "D" } );
	        	var thisTileItem = datacontext.createComplexType('TileItem', { id: itemId, name: "DOOR" });
	        	thisTile.item(thisTileItem);
	        	itemId += 1;
				xvar += 1;
			} else if (thisTile === ',') {
				// Start a new row
				xvar = 1;
				yvar += 1;
			}
		}
		datacontext.createEntity('Map', { id: thisMap.id, name: thisMap.name } )		
	}

	var mapCreator = {
		createMap: createMap
	};
	return mapCreator;

	function makeRandom(min, max) {
	  return Math.round(Math.random() * (max - min) + min);
	}

});