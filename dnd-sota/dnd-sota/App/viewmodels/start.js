define(function () {

    var activate = function () {
        console.log('Activated');
    }

    var home = {
        activate: activate
    };
    return home;

    window.dndSota = newGame();

    function newGame() {
        console.log('Starting game')	;
    }

    // Create all of the models

    // Go and create a player object

    dndSota.player = ko.observable(new newPlayer());
    // If false was returned,
    if (dndSota.player === false) {
        // Go get the player again
        dndSota.player(new newPlayer());
    }

    // Get a player name 

    function getPlayerName() {	
        var characterName = prompt("PLAYERS NAME : ", "Player"));
        if (characterName !== 'SHAVS') {
            // Move all alerts to a message area in the HTML
            alert('Who said you could play?');
            // Go back to choosing old or new game
            return false;
        }
        return characterName;
    }

    function newPlayer() {
        var self = this;
        self.gold = ko.observable(0);
        self.playerClass = ko.observable();
        self.name = ko.observable();

        // Do you need instructions

        // Old or new game?

        // If old continue reset?

        var name = getPlayerName();
        if (!name) {
            return false;
        } else {
            self.playerName(name);
        }

        // Else it goes and is doing some random stuff lines 450

        var inputClass = prompt("CLASSIFICATION - WHICH DO YOU WANT TO BE?  FIGHTER, CLERIC, OR WIZARD : ", "FIGHTER"));
        if (inputClass) {
            var thisClass = ko.utils.arrayFirst(dndSota.classes(), function (classobj) {
                return classobj.name() === inputClass;
            });
            if (!thisClass) { return false; }
            playerClass(thisClass);
        } else {
            return false;
        }

        var theseWeapons = buyWeapons();

        self.attributes = ko.observableArray([]);
        self.weapons = ko.observableArray([]);
        self.items = ko.observableArray([]);
        self.equipedWeapon = ko.observable();
    }

    function rand(min, max) {
        return Math.random() * (max - min) + min;	
    }

    function buyWeapons() {
        var theseWeapons = [];



        return theseWeapons;
    }

});