define(['services/session', 'services/game.objects', 'plugins/router', 'services/datacontext'], function (session, gameObjects, router, datacontext) {

	var character = ko.observable();
	var state = ko.observable(0);
	var initialized = false;
	var focusNameInput = ko.observable(false);
	var focusClassInput = ko.observable(false);
	var className = ko.observable();

	var activate = function () {
		if (!initialized) {
			character(datacontext.createEntity('Character', {}));
			state(1);
		}
		focusNameInput.subscribe(function (newValue) {
			focusNameInput(true);
		});
	};

	var classTypesString = ko.computed(function () {
		var thisString = "";
		ko.utils.arrayForEach(gameObjects.classTypes(), function (classType) {
			thisString += classType.name() + ', ';
		});
		thisString = thisString.substring(0, thisString.length - 2);
		return thisString;
	});

	var compositionComplete = function () {
		focusNameInput(true);
	};

	var charCreate = {
		activate: activate,
		compositionComplete: compositionComplete,
		classTypesString: classTypesString,
		create: create,
		addClass: addClass,
		focusNameInput: focusNameInput,
		focusClassInput: focusClassInput,
		focusIt: focusIt,
		character: character,
		className: className,
		state: state
	};
	return charCreate;

	function focusIt () {
		focusNameInput(true);
	}

	function create () {
		if (character() && character().name()) {
			if (character().name().toLowerCase() === 'shavs') {
				datacontext.saveEntity(character());
				state(2);
				focusNameInput(false);
				focusClassInput(true);
				character().strength(makeRandom(15, 15));
				character().dexterity(makeRandom(15, 15));
				character().constitution(makeRandom(15, 15));
				character().charisma(makeRandom(15, 15));
				character().wisdom(makeRandom(15, 15));
				character().intellect(makeRandom(15, 15));
				character().gold(makeRandom(15,15)*15);
				character().hitPoints(makeRandom(8, 8));
				return true;
			} else {
				datacontext.saveEntity(character());
				state(2);
				focusNameInput(false);
				focusClassInput(true);
				character().strength(makeRandom(1, 15));
				character().dexterity(makeRandom(1, 15));
				character().constitution(makeRandom(1, 15));
				character().charisma(makeRandom(1, 15));
				character().wisdom(makeRandom(1, 15));
				character().intellect(makeRandom(1, 15));
				character().gold(makeRandom(10,15)*15);
				character().hitPoints(makeRandom(2, 8));
			}
		}
	}

	function makeRandom(min, max) {
	  return Math.random() * (max - min) + min;
	}

	function addClass () {
        if (character() && className()) {
            var thisClass = ko.utils.arrayFirst(gameObjects.classTypes(), function (classobj) {
                return classobj.name().toLowerCase() === className().toLowerCase();
            });
            if (!thisClass) {
            	className(null);
            } else {
            	character().classType(thisClass);
				datacontext.saveEntity(character());
				session.currentPlayer(character());
            	return router.navigate('purchase');
            }
        } else {
			focusClassInput(true);
            return false;
        }
	}
	
});