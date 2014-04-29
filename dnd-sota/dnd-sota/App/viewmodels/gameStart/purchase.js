define(['services/session', 'services/game.objects', 'plugins/router', 'services/datacontext'], function (session, gameObjects, router, datacontext) {

	var player = ko.observable();
	var state = ko.observable();
	var fastOrNorm = ko.observable();
	var weaponName = ko.observable();
	var weaponTypes = gameObjects.weapons();

	function activate() {
		console.log('Activating');
		player(session.currentPlayer());
		// If there is no player kick back to character creation
		if (!player()) {
			router.navigate('charcreate');
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
		fastOrNorm: fastOrNorm,
		chooseFastOrNorm: chooseFastOrNorm,
		addWeapon: addWeapon,
		state: state,
		weaponTypes: weaponTypes
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

	function addWeapon() {
		console.log('Adding this weapon - ', weaponName());
		if (weaponName()) {
            var thisWeapon = ko.utils.arrayFirst(gameObjects.weapons(), function (weapon) {
                return weapon.name() === weaponName();
            });
            console.log(thisWeapon);
            if (!thisWeapon) {
            	weaponName(null);
            } else {
            	if (thisWeapon.value() > player().gold()) {
            		alert('COSTS TOO MUCH TRY AGAIN!');
            	} else {
            		console.log('Adding this weapon to weapons');
	            	player().weapons.push(thisWeapon);
					datacontext.saveEntity(player());
	            	return router.navigate('game');            		
            	}
            }
		}
	}
});