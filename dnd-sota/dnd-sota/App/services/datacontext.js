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
        createPlayerPosition: createPlayerPosition,
        findPlayerStart: findPlayerStart
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

    function createPlayerPosition(player, xvar, yvar) {
        var thisPosition = createComplexType('Position', { x: xvar, y: yvar });
        player.position(thisPosition);
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