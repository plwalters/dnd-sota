define(['services/session', 'services/game.objects', 'plugins/router', 'services/datacontext'], function (session, gameObjects, router, datacontext) {

	var player = ko.observable();
	var state = ko.observable();
	var fastOrNorm = ko.observable();
	var weaponName = ko.observable();
	var itemName = ko.observable();
	var weaponTypes = gameObjects.weapons();
	var items = ko.computed(function () {
		var theseItems = [];
		theseItems = ko.utils.arrayFilter(gameObjects.items(), function (item) {
			return item.canBuy() === true;
		});
		return theseItems;
	});

	function activate() {
		console.log('Activating');
		player(session.currentPlayer());
		// If there is no player kick back to character creation
		if (!player()) {
			router.navigate('');
		}
	}

	function attached() {		
		state(1);
	}

	var purchase = {
		player: player,
		activate: activate,
		attached: attached,
		weaponName: weaponName,
		itemName: itemName,
		fastOrNorm: fastOrNorm,
		chooseFastOrNorm: chooseFastOrNorm,
		addWeapon: addWeapon,
		addItem: addItem,
		state: state,
		weaponTypes: weaponTypes,
		items: items
	};
	return purchase;

	function chooseFastOrNorm() {		
		if (fastOrNorm()) {
			if (fastOrNorm() === 'FAST') {
				console.log('Show only fast');
			} else {
				console.log('Show only normal');
			}
			return state(2);
		}
	}

	function addItem() {
		if (itemName()) {
			// Check if it is the exit code
			if (state() === 3 && itemName() === '-1' || state() === 3 && itemName() === 'DONE') {				
            	return router.navigate('game'); 
			}
			// Try to get the weapon by name first
            var thisItem = ko.utils.arrayFirst(items(), function (item) {
            	console.log(item.name());
            	console.log(itemName());
                return item.name() === itemName();
            });
            console.log(thisItem);
            if (!thisItem) {
            	// Try to get the weapon by id instead of name
            	thisItem = ko.utils.arrayFirst(items(), function (item) {
	                return item.id() == itemName();
	            });
	            if (!thisItem) {
            		itemName(null);
            		return false;
	            }
            }
            if (thisItem.value() > player().gold()) {
        		alert('COSTS TOO MUCH TRY AGAIN!');
        	} else {
            	player().items.push(thisItem);
            	player().gold(player().gold() - thisItem.value());
				datacontext.saveEntity(player());
				itemName(null);
				return true;
        	}
		}
	}

	function addWeapon() {
		if (weaponName()) {
			// Check if it is going to buy items instead now
			if (weaponName() === '-1' || weaponName() === 'DONE') {				
				state(3);
			}
			// Try to get the weapon by name first
            var thisWeapon = ko.utils.arrayFirst(gameObjects.weapons(), function (weapon) {
                return weapon.name() === weaponName();
            });
            if (!thisWeapon) {
            	// Try to get the weapon by id instead of name
            	thisWeapon = ko.utils.arrayFirst(gameObjects.weapons(), function (weapon) {
	                return weapon.id() == weaponName();
	            });
	            if (!thisWeapon) {
            		weaponName(null);
            		return false;
	            }
            }
            if (thisWeapon.value() > player().gold()) {
        		alert('COSTS TOO MUCH TRY AGAIN!');
        	} else {
            	player().weapons.push(thisWeapon);
            	player().gold(player().gold() - thisWeapon.value());
				datacontext.saveEntity(player());
				weaponName(null);
				return true;
        	}
		}
	}
});