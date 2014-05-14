define(['plugins/router', 'durandal/app', 'services/game.objects', 'services/bindings'], function (router, app, gameObjects, bindings) {
    
	var initialized = false;

    var shell = {
    	router: router,
    	activate: activate
    };
    return shell;

    function activate () {
    	if (!initialized) {
            
    	}
        router.map([
            { route: '', title:'Game', moduleId: 'viewmodels/gameStart/game', nav: true },
            { route: 'home', title:'Home', moduleId: 'viewmodels/home' },
            { route: 'about', title:'About', moduleId: 'viewmodels/about', nav: true },
            { route: 'designer', title:'Designer', moduleId: 'viewmodels/gameStart/designer', nav: true },
            { route: 'game', title:'Game', moduleId: 'viewmodels/gameStart/game' }
        ]).buildNavigationModel();
        
        return router.activate();
    };
});