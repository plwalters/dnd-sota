define(['models/config.models'], function (modelConfig) {

    var EntityQuery = breeze.EntityQuery;
    var Predicate = breeze.Predicate;

    // The data service is responsible for telling the queries where to query from
    var ds = new breeze.DataService({
        adapterName: 'webApi',
        serviceName: 'api/breeze',
        hasServerMetadata: false
    });

    // The manager is where all of the entities are stored
    var manager = configureBreezeManager();
    var metadataStore = manager.metadataStore;

    var datacontext = {
        createEntity: createEntity,
        createComplexType: createComplexType,
        saveEntity: saveEntity,
        getTileByCoord: getTileByCoord,
        getMap: getMap,
        getMapsList: getMapsList,
        createPlayerPosition: createPlayerPosition,
        createEnemyPosition: createEnemyPosition,
        findPlayerStart: findPlayerStart,
        findEnemy: findEnemy,
        saveMapsAndTiles: saveMapsAndTiles
    };
    return datacontext;

    function getMap (observable, mapId) {
        // Get the map from cachec

        // Get the tile by coordinates and map
        var query = EntityQuery.from('Maps')
            .toType('Map')
            .where('id', '==', mapId);

        thisMap = manager.executeQueryLocally(query);

        // Set it to this object and return
        return observable(thisMap[0]);
    }

    function getMapsList (observable) {
        // Get the map from cachec

        // Get the tile by coordinates and map
        var query = EntityQuery.from('Maps')
            .toType('Map');

        theseMaps = manager.executeQueryLocally(query);

        // Set it to this object and return
        return observable(theseMaps);
    }

    function getTileByCoord (observable, xCoord, yCoord, mapId) {
        var xPred = new Predicate('x', '==', xCoord);
        var yPred = new Predicate('y', '==', yCoord);
        var mapPred = new Predicate('mapId', '==', mapId);

        // Make a total predicate to find the tile
        var totalPred = xPred.and(yPred, mapPred);

        // Get the tile by coordinates and map
        var query = EntityQuery.from('Tiles')
            .toType('Tile')
            .where(totalPred);

        var result = manager.executeQueryLocally(query);

        if (observable) { 
            return observable(result[0]);
        }
        return result[0];
    }

    function saveMapsAndTiles() {        
        var selectedMapsAndTiles = EntityQuery.from('Maps')
            .where('id', '!=', 1)
            .using(manager)
            .toType('Map')
            .executeLocally(); // cache-only query returns synchronously
         saveMapToLocalStorage(selectedMapsAndTiles);

        function saveMapToLocalStorage(selectedMapsAndTiles) {
            var exportData = manager.exportEntities(null, false);
            saveToLocalStorage(exportData);
        }

    }

    function saveToLocalStorage(data) {
        window.localStorage.setItem('dnd-sota', data);
    }

    function getFromLocalStorage() {
        var importData = window.localStorage.getItem('dnd-sota');
        ///manager.importEntities(importData);
        manager.importEntities(importData, {mergeStrategy: breeze.MergeStrategy.OverwriteChanges});
    }

    function saveEntity(entity) {
        entity.entityAspect.acceptChanges();
    }

    function findPlayerStart(mapId) {
       var imagePred = new Predicate('image', '==', 'U');
        var mapPred = new Predicate('mapId', '==', mapId);

        // Make a total predicate to find the tile
        var totalPred = mapPred.and(imagePred);

        // Get the tile by coordinates and map
        var query = EntityQuery.from('Tiles')
            .toType('Tile')
            .where(totalPred);

        var result = manager.executeQueryLocally(query);
        return result[0];
    }

    function findEnemy(mapId) {
        var imagePred = new Predicate('enemySpawnType', '!=', null);
        var mapPred = new Predicate('mapId', '==', mapId);

        // Make a total predicate to find the tile
        var totalPred = mapPred.and(imagePred);

        // Get the tile by coordinates and map
        var query = EntityQuery.from('Tiles')
            .orderBy('enemySpawnOrder')
            .toType('Tile')
            .where(totalPred);

        var result = manager.executeQueryLocally(query);
        // Get the first enemy
        var thisEnemyTile = result[0];
        return thisEnemyTile;
    }

    function createPlayerPosition(player, xvar, yvar) {
        var thisPosition = createComplexType('Position', { x: xvar, y: yvar });
        player.position(thisPosition);
    }

    function createEnemyPosition(enemy, xvar, yvar) {
        var thisPosition = createComplexType('Position', { x: xvar, y: yvar });
        enemy.position(thisPosition);
    }

    function createEntity(entityType, constructorProperties) {
        var thisEntity = manager.createEntity(entityType, constructorProperties);
        thisEntity.entityAspect.acceptChanges();
        return thisEntity;
    };

    function createComplexType(entityType, constructorProperties) {
        var thisEntityType = manager.metadataStore.getEntityType(entityType);
        var thisEntity = thisEntityType.createInstance(constructorProperties);
        return thisEntity;
    };

    // Configure the Breeze entity manager to always pass an api key
    function configureBreezeManager() {
        breeze.NamingConvention.camelCase.setAsDefault();
        breeze.config.initializeAdapterInstance("ajax", "jQuery", true);
        var mgr = new breeze.EntityManager({ dataService: ds });
        // Register the model types in models in the entity manager
        modelConfig.initialize(mgr.metadataStore);
        return mgr;
    };


});