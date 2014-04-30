define(['services/session', 'services/game.objects', 'plugins/router', 'services/datacontext'], function (session, gameObjects, router, datacontext) {

	var idValue = ko.observable();
	var nameValue = ko.observable();
	var mapString = ko.observable();
	var isNew = ko.observable(true);
	var tileTypes = gameObjects.tileTypes;
	var idIsInvalid = ko.computed(function () {
		return !idValue();
	});
	var nameIsInvalid = ko.computed(function () {
		return !nameValue();
	});
	var canSave = ko.computed(function () {
		return !idIsInvalid() && !nameIsInvalid();
	});
	var exampleString="******,\n*U...*,\n*....*,\n*....*,\n******";
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
		exampleString: exampleString,
		nameIsInvalid: nameIsInvalid,
		idIsInvalid: idIsInvalid,
		save: save,
		canSave: canSave,
		tileTypes: tileTypes
	};
	return designer;

	function create () {
		newMap = {
			id: idValue(),
			name: nameValue(),
			layout: mapString()
		}
		gameObjects.mapCreator(newMap);
		isNew(false);
		mapString(null);
		nameValue(null);
		idValue(null);
	}

	function save () {
		
	}

});