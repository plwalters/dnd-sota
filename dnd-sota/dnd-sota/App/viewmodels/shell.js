define(['plugins/router', 'durandal/app', 'services/game.objects', 'services/bindings'], function (router, app, gameObjects, bindings) {
    
	var initialized = false;

    var shell = {
    	router: router,
    	activate: activate
    };
    return shell;

    function activate () {
    	if (!initialized) {
    		console.log(gameObjects);
    	}
        router.map([
            { route: '', title:'Create Character', moduleId: 'viewmodels/gameStart/character.create', nav: true },
            { route: 'home', title:'Home', moduleId: 'viewmodels/home' },
            { route: 'about', title:'About', moduleId: 'viewmodels/about', nav: true },
            { route: 'designer', title:'Designer', moduleId: 'viewmodels/gameStart/designer', nav: true },
            { route: 'charcreate', title:'Create Character', moduleId: 'viewmodels/gameStart/character.create' },
            { route: 'purchase', title:'Purchase', moduleId: 'viewmodels/gameStart/purchase' },
            { route: 'game', title:'Game', moduleId: 'viewmodels/gameStart/game' }
        ]).buildNavigationModel();
        
        return router.activate();
    };
});