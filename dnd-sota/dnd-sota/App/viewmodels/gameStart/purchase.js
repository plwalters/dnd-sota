define(['services/session', 'services/game.objects', 'plugins/router', 'services/datacontext'], function (session, gameObjects, router, datacontext) {

	var player = ko.observable();
	var state = ko.observable();
	var fastOrNorm = ko.observable();
	var weaponName = ko.observable();
	var itemName = ko.observable();
	var weaponTypes = ko.computed(function () {
		var theseWeapons = gameObjects.weapons();
		theseWeapons = ko.utils.arrayFilter(theseWeapons, function (wep) {
			return wep.name() !== 'FISTS';
		});
		return theseWeapons;
	});
	var items = ko.computed(function () {
		var theseItems = [];
		theseItems = ko.utils.arrayFilter(gameObjects.items(), function (item) {
			return item.canBuy() === true;
		});
		return theseItems;
	});

	function activate() {
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
		items: items,
		clickItem: clickItem
	};
	return purchase;

	function clickItem (sender) {
		if (state() === 1) {
			fastOrNorm(sender);	
			chooseFastOrNorm();
		} else if (state() === 2) {
			var thisInput = sender === 0 ? '0' : (ko.unwrap(sender) + 1).toString();
			weaponName(thisInput);
			addWeapon();
		} else {
			var thisInput = sender === 0 ? '0' :(ko.unwrap(sender) + 7).toString();
			console.log('This input - ', thisInput);
			itemName(thisInput);
			addItem();
		}
	}

	function chooseFastOrNorm() {		
		if (fastOrNorm()) {
			if (fastOrNorm() === 'FAST') {
				console.log("IT DOESN'T MATTER WHAT YOU TYPE!");
			} else {
				console.log("IT DOESN'T MATTER WHAT YOU TYPE!");
			}
			return state(2);
		}
	}

	function addItem() {
		console.log(itemName());
		if (itemName()) {
			var thisItemName = itemName().toLowerCase();
			// Check if it is the exit code
			if (state() === 3 && thisItemName === '0' || state() === 3 && thisItemName === 'done') {				
            	return router.navigate('game'); 
			}
			// Try to get the weapon by name first
            var thisItem = ko.utils.arrayFirst(items(), function (item) {
                return item.name().toLowerCase() === thisItemName;
            });
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
			var thisWeaponName = weaponName().toLowerCase();
			// Check if it is going to buy items instead now
			if (thisWeaponName === '0' || thisWeaponName === 'done') {
				// Add fists as a weapon
				var fists = ko.utils.arrayFirst(gameObjects.weapons(), function (wep) {
					return wep.name() === 'FISTS';
				});
				player().weapons.push(fists);
				player().weapon(fists);
				// Advance to purchase items
				state(3);
			}
			// Try to get the weapon by name first
            var thisWeapon = ko.utils.arrayFirst(gameObjects.weapons(), function (weapon) {
                return weapon.name().toLowerCase() === thisWeaponName;
            });
            if (!thisWeapon) {
            	// Try to get the weapon by id instead of name
            	thisWeapon = ko.utils.arrayFirst(gameObjects.weapons(), function (weapon) {
	                return weapon.id() == thisWeaponName;
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