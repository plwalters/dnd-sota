define(['services/session', 'services/game.objects', 'plugins/router', 'services/datacontext'], function (session, gameObjects, router, datacontext) {

	var idValue = ko.observable();
	var nameValue = ko.observable();
	var mapString = ko.observable();
	var isNew = ko.observable(true);
	var tileTypes = gameObjects.tileTypes;

	function activate() {
		console.log('Activating');
	}

	function attached() {
		console.log('Attached');
	}

	var designer = {
		activate: activate,
		idValue: idValue,
		nameValue: nameValue,
		attached: attached,
		isNew: isNew,
		create: create,
		mapString: mapString,
		save: save,
		tileTypes: tileTypes
	};
	return designer;

	function create () {
		console.log('Creating a new map from this - ', mapString());
		newMap = {
			id: idValue(),
			name: nameValue(),
			layout: mapString()
		}
		gameObjects.mapCreator(newMap);
		console.log('Done saving');
		isNew(false);
	}

	function save () {
		
	}

});