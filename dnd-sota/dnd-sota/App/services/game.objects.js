	define(['services/datacontext'], function (datacontext) {

	var weapons = ko.observableArray([	
		datacontext.createEntity('Weapon', { id: 1, name: 'SWORD', damage: 1, value: 10 } ),
		datacontext.createEntity('Weapon', { id: 2, name: '2-H-SWORD', damage: 1, value: 15 } ),
		datacontext.createEntity('Weapon', { id: 3, name: 'DAGGER', damage: 1, value: 3 } ),
		datacontext.createEntity('Weapon', { id: 4, name: 'MACE', damage: 1, value: 15 } ),
		datacontext.createEntity('Weapon', { id: 5, name: 'SPEAR', damage: 1, value: 15 } ),
		datacontext.createEntity('Weapon', { id: 6, name: 'BOW', damage: 1, value: 15 } )
	]);

	var armors = ko.observableArray([
		datacontext.createEntity('Armor', { name: 'LEATHER MAIL', defense: 1, value: 15 } ),
		datacontext.createEntity('Armor', { name: 'CHAIN MAIL', defense: 1, value: 30 } ),
		datacontext.createEntity('Armor', { name: 'TLTE MAIL', defense: 1, value: 50 } )
	]);

	var tileTypes = ko.observableArray([
		datacontext.createEntity('TileType', { name: 'WALL', designerImage: '*', image: '*' } ),
		datacontext.createEntity('TileType', { name: 'EMPTY', designerImage: '.', image: ' '} ),
		datacontext.createEntity('TileType', { name: 'GOLD', designerImage: '$', image: '$'  } ),
		datacontext.createEntity('TileType', { name: 'ENEMY', designerImage: 'E', image: 'E'  } ),
		datacontext.createEntity('TileType', { name: 'DOOR', designerImage: 'D', image: 'D'  } ),
		datacontext.createEntity('TileType', { name: 'LINE END', designerImage: ',', image: ' '  } )
	]);

	var classTypes = ko.observableArray([	
		datacontext.createEntity('ClassType', { name: 'FIGHTER', startingGold: 8 } ),
		datacontext.createEntity('ClassType', { name: 'CLERIC', startingGold: 4 } ),
		datacontext.createEntity('ClassType', { name: 'WIZARD', startingGold: 6 } )
	]);

	var attributes = ko.observableArray([
		datacontext.createEntity('Attribute', { name: 'STRENGTH' } ),
		datacontext.createEntity('Attribute', { name: 'DEXTERITY' } ),
		datacontext.createEntity('Attribute', { name: 'CON' } ),
		datacontext.createEntity('Attribute', { name: 'CHAR' } ),
		datacontext.createEntity('Attribute', { name: 'WISDOM' } ),
		datacontext.createEntity('Attribute', { name: 'INTELLECT' } )
	]);

	var items = ko.observableArray([	
		datacontext.createEntity('Item', { id: 7, name: 'ROPE', value: 1, canBuy: true } ),
		datacontext.createEntity('Item', { id: 8, name: 'SPIKES', value: 1, canBuy: true } ),
		datacontext.createEntity('Item', { id: 9, name: 'FLASK OF OIL', value: 2, canBuy: true } ),
		datacontext.createEntity('Item', { id: 10, name: 'SILVER CROSS', value: 25, canBuy: true } ),
		datacontext.createEntity('Item', { id: 11, name: 'SPARE FOOD', value: 5, canBuy: true } ),
		datacontext.createEntity('Item', { id: 12, name: 'ARROWS', value: 15, canBuy: true } ),
		datacontext.createEntity('Item', { id: 13, name: 'GOLD', value: 25, canBuy: false } ),
		datacontext.createEntity('Item', { id: 14, name: 'DOOR', value: 0, canBuy: false } )
	]);

	var goldItem = items()[6];

	var maps = ko.observableArray([	
		datacontext.createEntity('Map', { id: 1, name: 'DND1' } )
	]);

	var secondMap = {
		id: 3,
		name: "Second",
		layout: "*******,*U    *,*     *,*** ***,*     *,*     *,*******"
	}

	var thirdMap = {
		id: 4,
		name: "Third",
		layout: "*******,*U    *,*    $*,*** ***,*     *,*    $*,*******"
	}

	var fourthMap = {
		id: 2,
		name: "Second",
		layout: "**************,*U...........*,*......E....$*,**D***..******,D............*,*....E......$*,*..***********,*....****....*,*....****....*,*............*,**************"
	}

	mapCreator(fourthMap);

	function mapCreator(thisMap) {
		var thisLayout = thisMap.layout;
		var xvar = 1;
		var yvar = 1;
		var itemId = 1;
		var enemyId = 1;
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
				var thisTile = datacontext.createEntity('Tile', { name: 'Tile', mapId: thisMap.id, occupied: false, x: xvar, y: yvar, image: "$" } );
	        	var thisTileItem = datacontext.createComplexType('TileItem', { id: itemId, name: "GOLD", value: 10 });
	        	thisTile.item(thisTileItem);
	        	itemId += 1;
				xvar += 1;
			} else if (thisTile === 'E') {
				// Create an enemy start tile
				var thisTile = datacontext.createEntity('Tile', { name: 'Tile', mapId: thisMap.id, occupied: true, x: xvar, y: yvar, image: "E" } );
	        	var thisTileEnemy = datacontext.createComplexType('TileEnemy', { id: enemyId, name: "GOBLIN", hitPoints: 10, damage: 2 });
	        	thisTile.enemy(thisTileEnemy);
	        	enemyId += 1;
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

	var models = {
		weapons: weapons,
		armors: armors,
		classTypes: classTypes,
		attributes: attributes,
		items: items,
		maps: maps,
		tileTypes: tileTypes,
		mapCreator: mapCreator
	};
	return models;

});