(function () {/**
 * almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    function onResourceLoad(name, defined, deps){
        if(requirejs.onResourceLoad && name){
            requirejs.onResourceLoad({defined:defined}, {id:name}, deps);
        }
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }

        onResourceLoad(name, defined, args);
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../Scripts/almond-custom", function(){});

define('durandal/system',["require","jquery"],function(e,t){function n(e){var t="[object "+e+"]";a["is"+e]=function(e){return s.call(e)==t}}var a,i=!1,r=Object.keys,o=Object.prototype.hasOwnProperty,s=Object.prototype.toString,u=!1,c=Array.isArray,l=Array.prototype.slice;if(Function.prototype.bind&&("object"==typeof console||"function"==typeof console)&&"object"==typeof console.log)try{["log","info","warn","error","assert","dir","clear","profile","profileEnd"].forEach(function(e){console[e]=this.call(console[e],console)},Function.prototype.bind)}catch(d){u=!0}e.on&&e.on("moduleLoaded",function(e,t){a.setModuleId(e,t)}),"undefined"!=typeof requirejs&&(requirejs.onResourceLoad=function(e,t){a.setModuleId(e.defined[t.id],t.id)});var f=function(){},p=function(){try{if("undefined"!=typeof console&&"function"==typeof console.log)if(window.opera)for(var e=0;e<arguments.length;)console.log("Item "+(e+1)+": "+arguments[e]),e++;else 1==l.call(arguments).length&&"string"==typeof l.call(arguments)[0]?console.log(l.call(arguments).toString()):console.log.apply(console,l.call(arguments));else Function.prototype.bind&&!u||"undefined"==typeof console||"object"!=typeof console.log||Function.prototype.call.call(console.log,console,l.call(arguments))}catch(t){}},v=function(e){if(e instanceof Error)throw e;throw new Error(e)};a={version:"2.0.1",noop:f,getModuleId:function(e){return e?"function"==typeof e?e.prototype.__moduleId__:"string"==typeof e?null:e.__moduleId__:null},setModuleId:function(e,t){return e?"function"==typeof e?(e.prototype.__moduleId__=t,void 0):("string"!=typeof e&&(e.__moduleId__=t),void 0):void 0},resolveObject:function(e){return a.isFunction(e)?new e:e},debug:function(e){return 1==arguments.length&&(i=e,i?(this.log=p,this.error=v,this.log("Debug:Enabled")):(this.log("Debug:Disabled"),this.log=f,this.error=f)),i},log:f,error:f,assert:function(e,t){e||a.error(new Error(t||"Assert:Failed"))},defer:function(e){return t.Deferred(e)},guid:function(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){var t=0|16*Math.random(),n="x"==e?t:8|3&t;return n.toString(16)})},acquire:function(){var t,n=arguments[0],i=!1;return a.isArray(n)?(t=n,i=!0):t=l.call(arguments,0),this.defer(function(n){e(t,function(){var e=arguments;setTimeout(function(){e.length>1||i?n.resolve(l.call(e,0)):n.resolve(e[0])},1)},function(e){n.reject(e)})}).promise()},extend:function(e){for(var t=l.call(arguments,1),n=0;n<t.length;n++){var a=t[n];if(a)for(var i in a)e[i]=a[i]}return e},wait:function(e){return a.defer(function(t){setTimeout(t.resolve,e)}).promise()}},a.keys=r||function(e){if(e!==Object(e))throw new TypeError("Invalid object");var t=[];for(var n in e)o.call(e,n)&&(t[t.length]=n);return t},a.isElement=function(e){return!(!e||1!==e.nodeType)},a.isArray=c||function(e){return"[object Array]"==s.call(e)},a.isObject=function(e){return e===Object(e)},a.isBoolean=function(e){return"boolean"==typeof e},a.isPromise=function(e){return e&&a.isFunction(e.then)};for(var m=["Arguments","Function","String","Number","Date","RegExp"],g=0;g<m.length;g++)n(m[g]);return a});
define('durandal/viewEngine',["durandal/system","jquery"],function(e,t){var n;return n=t.parseHTML?function(e){return t.parseHTML(e)}:function(e){return t(e).get()},{viewExtension:".html",viewPlugin:"text",isViewUrl:function(e){return-1!==e.indexOf(this.viewExtension,e.length-this.viewExtension.length)},convertViewUrlToViewId:function(e){return e.substring(0,e.length-this.viewExtension.length)},convertViewIdToRequirePath:function(e){return this.viewPlugin+"!"+e+this.viewExtension},parseMarkup:n,processMarkup:function(e){var t=this.parseMarkup(e);return this.ensureSingleElement(t)},ensureSingleElement:function(e){if(1==e.length)return e[0];for(var n=[],i=0;i<e.length;i++){var a=e[i];if(8!=a.nodeType){if(3==a.nodeType){var r=/\S/.test(a.nodeValue);if(!r)continue}n.push(a)}}return n.length>1?t(n).wrapAll('<div class="durandal-wrapper"></div>').parent().get(0):n[0]},createView:function(t){var n=this,i=this.convertViewIdToRequirePath(t);return e.defer(function(a){e.acquire(i).then(function(e){var i=n.processMarkup(e);i.setAttribute("data-view",t),a.resolve(i)}).fail(function(e){n.createFallbackView(t,i,e).then(function(e){e.setAttribute("data-view",t),a.resolve(e)})})}).promise()},createFallbackView:function(t,n){var i=this,a='View Not Found. Searched for "'+t+'" via path "'+n+'".';return e.defer(function(e){e.resolve(i.processMarkup('<div class="durandal-view-404">'+a+"</div>"))}).promise()}}});
define('durandal/viewLocator',["durandal/system","durandal/viewEngine"],function(e,t){function n(e,t){for(var n=0;n<e.length;n++){var i=e[n],a=i.getAttribute("data-view");if(a==t)return i}}function i(e){return(e+"").replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g,"\\$1")}return{useConvention:function(e,t,n){e=e||"viewmodels",t=t||"views",n=n||t;var a=new RegExp(i(e),"gi");this.convertModuleIdToViewId=function(e){return e.replace(a,t)},this.translateViewIdToArea=function(e,t){return t&&"partial"!=t?n+"/"+t+"/"+e:n+"/"+e}},locateViewForObject:function(t,n,i){var a;if(t.getView&&(a=t.getView()))return this.locateView(a,n,i);if(t.viewUrl)return this.locateView(t.viewUrl,n,i);var r=e.getModuleId(t);return r?this.locateView(this.convertModuleIdToViewId(r),n,i):this.locateView(this.determineFallbackViewId(t),n,i)},convertModuleIdToViewId:function(e){return e},determineFallbackViewId:function(e){var t=/function (.{1,})\(/,n=t.exec(e.constructor.toString()),i=n&&n.length>1?n[1]:"";return"views/"+i},translateViewIdToArea:function(e){return e},locateView:function(i,a,r){if("string"==typeof i){var o;if(o=t.isViewUrl(i)?t.convertViewUrlToViewId(i):i,a&&(o=this.translateViewIdToArea(o,a)),r){var s=n(r,o);if(s)return e.defer(function(e){e.resolve(s)}).promise()}return t.createView(o)}return e.defer(function(e){e.resolve(i)}).promise()}}});
define('durandal/binder',["durandal/system","knockout"],function(e,t){function a(t){return void 0===t?{applyBindings:!0}:e.isBoolean(t)?{applyBindings:t}:(void 0===t.applyBindings&&(t.applyBindings=!0),t)}function n(n,u,l,d){if(!u||!l)return i.throwOnErrors?e.error(r):e.log(r,u,d),void 0;if(!u.getAttribute)return i.throwOnErrors?e.error(o):e.log(o,u,d),void 0;var y=u.getAttribute("data-view");try{var m;return n&&n.binding&&(m=n.binding(u)),m=a(m),i.binding(d,u,m),m.applyBindings?(e.log("Binding",y,d),t.applyBindings(l,u)):n&&t.utils.domData.set(u,c,{$data:n}),i.bindingComplete(d,u,m),n&&n.bindingComplete&&n.bindingComplete(u),t.utils.domData.set(u,s,m),m}catch(p){p.message=p.message+";\nView: "+y+";\nModuleId: "+e.getModuleId(d),i.throwOnErrors?e.error(p):e.log(p.message)}}var i,r="Insufficient Information to Bind",o="Unexpected View Type",s="durandal-binding-instruction",c="__ko_bindingContext__";return i={binding:e.noop,bindingComplete:e.noop,throwOnErrors:!1,getBindingInstruction:function(e){return t.utils.domData.get(e,s)},bindContext:function(e,t,a){return a&&e&&(e=e.createChildContext(a)),n(a,t,e,a||(e?e.$data:null))},bind:function(e,t){return n(e,t,e,e)}}});
define('durandal/activator',["durandal/system","knockout"],function(e,t){function a(e){return void 0==e&&(e={}),e.closeOnDeactivate||(e.closeOnDeactivate=u.defaults.closeOnDeactivate),e.beforeActivate||(e.beforeActivate=u.defaults.beforeActivate),e.afterDeactivate||(e.afterDeactivate=u.defaults.afterDeactivate),e.affirmations||(e.affirmations=u.defaults.affirmations),e.interpretResponse||(e.interpretResponse=u.defaults.interpretResponse),e.areSameItem||(e.areSameItem=u.defaults.areSameItem),e}function n(t,a,n){return e.isArray(n)?t[a].apply(t,n):t[a](n)}function i(t,a,n,i,r){if(t&&t.deactivate){e.log("Deactivating",t);var o;try{o=t.deactivate(a)}catch(s){return e.error(s),i.resolve(!1),void 0}o&&o.then?o.then(function(){n.afterDeactivate(t,a,r),i.resolve(!0)},function(t){e.log(t),i.resolve(!1)}):(n.afterDeactivate(t,a,r),i.resolve(!0))}else t&&n.afterDeactivate(t,a,r),i.resolve(!0)}function r(t,a,i,r){if(t)if(t.activate){e.log("Activating",t);var o;try{o=n(t,"activate",r)}catch(s){return e.error(s),i(!1),void 0}o&&o.then?o.then(function(){a(t),i(!0)},function(t){e.log(t),i(!1)}):(a(t),i(!0))}else a(t),i(!0);else i(!0)}function o(t,a,n){return n.lifecycleData=null,e.defer(function(i){if(t&&t.canDeactivate){var r;try{r=t.canDeactivate(a)}catch(o){return e.error(o),i.resolve(!1),void 0}r.then?r.then(function(e){n.lifecycleData=e,i.resolve(n.interpretResponse(e))},function(t){e.error(t),i.resolve(!1)}):(n.lifecycleData=r,i.resolve(n.interpretResponse(r)))}else i.resolve(!0)}).promise()}function s(t,a,i,r){return i.lifecycleData=null,e.defer(function(o){if(t==a())return o.resolve(!0),void 0;if(t&&t.canActivate){var s;try{s=n(t,"canActivate",r)}catch(c){return e.error(c),o.resolve(!1),void 0}s.then?s.then(function(e){i.lifecycleData=e,o.resolve(i.interpretResponse(e))},function(t){e.error(t),o.resolve(!1)}):(i.lifecycleData=s,o.resolve(i.interpretResponse(s)))}else o.resolve(!0)}).promise()}function c(n,c){var u,l=t.observable(null);c=a(c);var d=t.computed({read:function(){return l()},write:function(e){d.viaSetter=!0,d.activateItem(e)}});return d.__activator__=!0,d.settings=c,c.activator=d,d.isActivating=t.observable(!1),d.canDeactivateItem=function(e,t){return o(e,t,c)},d.deactivateItem=function(t,a){return e.defer(function(e){d.canDeactivateItem(t,a).then(function(n){n?i(t,a,c,e,l):(d.notifySubscribers(),e.resolve(!1))})}).promise()},d.canActivateItem=function(e,t){return s(e,l,c,t)},d.activateItem=function(t,a){var n=d.viaSetter;return d.viaSetter=!1,e.defer(function(o){if(d.isActivating())return o.resolve(!1),void 0;d.isActivating(!0);var s=l();return c.areSameItem(s,t,u,a)?(d.isActivating(!1),o.resolve(!0),void 0):(d.canDeactivateItem(s,c.closeOnDeactivate).then(function(y){y?d.canActivateItem(t,a).then(function(y){y?e.defer(function(e){i(s,c.closeOnDeactivate,c,e)}).promise().then(function(){t=c.beforeActivate(t,a),r(t,l,function(e){u=a,d.isActivating(!1),o.resolve(e)},a)}):(n&&d.notifySubscribers(),d.isActivating(!1),o.resolve(!1))}):(n&&d.notifySubscribers(),d.isActivating(!1),o.resolve(!1))}),void 0)}).promise()},d.canActivate=function(){var e;return n?(e=n,n=!1):e=d(),d.canActivateItem(e)},d.activate=function(){var e;return n?(e=n,n=!1):e=d(),d.activateItem(e)},d.canDeactivate=function(e){return d.canDeactivateItem(d(),e)},d.deactivate=function(e){return d.deactivateItem(d(),e)},d.includeIn=function(e){e.canActivate=function(){return d.canActivate()},e.activate=function(){return d.activate()},e.canDeactivate=function(e){return d.canDeactivate(e)},e.deactivate=function(e){return d.deactivate(e)}},c.includeIn?d.includeIn(c.includeIn):n&&d.activate(),d.forItems=function(t){c.closeOnDeactivate=!1,c.determineNextItemToActivate=function(e,t){var a=t-1;return-1==a&&e.length>1?e[1]:a>-1&&a<e.length-1?e[a]:null},c.beforeActivate=function(e){var a=d();if(e){var n=t.indexOf(e);-1==n?t.push(e):e=t()[n]}else e=c.determineNextItemToActivate(t,a?t.indexOf(a):0);return e},c.afterDeactivate=function(e,a){a&&t.remove(e)};var a=d.canDeactivate;d.canDeactivate=function(n){return n?e.defer(function(e){function a(){for(var t=0;t<r.length;t++)if(!r[t])return e.resolve(!1),void 0;e.resolve(!0)}for(var i=t(),r=[],o=0;o<i.length;o++)d.canDeactivateItem(i[o],n).then(function(e){r.push(e),r.length==i.length&&a()})}).promise():a()};var n=d.deactivate;return d.deactivate=function(a){return a?e.defer(function(e){function n(n){d.deactivateItem(n,a).then(function(){r++,t.remove(n),r==o&&e.resolve()})}for(var i=t(),r=0,o=i.length,s=0;o>s;s++)n(i[s])}).promise():n()},d},d}var u,l={closeOnDeactivate:!0,affirmations:["yes","ok","true"],interpretResponse:function(a){return e.isObject(a)&&(a=a.can||!1),e.isString(a)?-1!==t.utils.arrayIndexOf(this.affirmations,a.toLowerCase()):a},areSameItem:function(e,t){return e==t},beforeActivate:function(e){return e},afterDeactivate:function(e,t,a){t&&a&&a(null)}};return u={defaults:l,create:c,isActivator:function(e){return e&&e.__activator__}}});
define('durandal/composition',["durandal/system","durandal/viewLocator","durandal/binder","durandal/viewEngine","durandal/activator","jquery","knockout"],function(e,t,a,n,i,r,o){function s(e){for(var t=[],a={childElements:t,activeView:null},n=o.virtualElements.firstChild(e);n;)1==n.nodeType&&(t.push(n),n.getAttribute(I)&&(a.activeView=n)),n=o.virtualElements.nextSibling(n);return a.activeView||(a.activeView=t[0]),a}function c(){A--,0===A&&setTimeout(function(){for(var t=b.length;t--;)try{b[t]()}catch(a){e.error(a)}b=[]},1)}function l(e){delete e.activeView,delete e.viewElements}function u(t,a,n){if(n)a();else if(t.activate&&t.model&&t.model.activate){var i;try{i=e.isArray(t.activationData)?t.model.activate.apply(t.model,t.activationData):t.model.activate(t.activationData),i&&i.then?i.then(a,function(t){e.error(t),a()}):i||void 0===i?a():(c(),l(t))}catch(r){e.error(r)}}else a()}function d(){var t=this;if(t.activeView&&t.activeView.removeAttribute(I),t.child)try{t.model&&t.model.attached&&(t.composingNewView||t.alwaysTriggerAttach)&&t.model.attached(t.child,t.parent,t),t.attached&&t.attached(t.child,t.parent,t),t.child.setAttribute(I,!0),t.composingNewView&&t.model&&t.model.detached&&o.utils.domNodeDisposal.addDisposeCallback(t.child,function(){try{t.model.detached(t.child,t.parent,t)}catch(a){e.error(a)}})}catch(a){e.error(a)}t.triggerAttach=e.noop}function m(t){if(e.isString(t.transition)){if(t.activeView){if(t.activeView==t.child)return!1;if(!t.child)return!0;if(t.skipTransitionOnSameViewId){var a=t.activeView.getAttribute("data-view"),n=t.child.getAttribute("data-view");return a!=n}}return!0}return!1}function v(e){for(var t=0,a=e.length,n=[];a>t;t++){var i=e[t].cloneNode(!0);n.push(i)}return n}function p(e){var t=v(e.parts),a=h.getParts(t,null,!0),n=h.getParts(e.child);for(var i in a)r(n[i]).replaceWith(a[i])}function y(t){var a,n,i=o.virtualElements.childNodes(t.parent);if(!e.isArray(i)){var r=[];for(a=0,n=i.length;n>a;a++)r[a]=i[a];i=r}for(a=1,n=i.length;n>a;a++)o.removeNode(i[a])}function f(e){o.utils.domData.set(e,O,e.style.display),e.style.display="none"}function g(e){e.style.display=o.utils.domData.get(e,O)}function T(e){var t=e.getAttribute("data-bind");if(!t)return!1;for(var a=0,n=D.length;n>a;a++)if(t.indexOf(D[a])>-1)return!0;return!1}var h,E={},I="data-active-view",b=[],A=0,w="durandal-composition-data",S="data-part",N=["model","view","transition","area","strategy","activationData"],O="durandal-visibility-data",D=["compose:"],C={complete:function(e){b.push(e)}};return h={composeBindings:D,convertTransitionToModuleId:function(e){return"transitions/"+e},defaultTransitionName:null,current:C,addBindingHandler:function(e,t,a){var n,i,r="composition-handler-"+e;t=t||o.bindingHandlers[e],a=a||function(){return void 0},i=o.bindingHandlers[e]={init:function(e,n,i,s,c){if(A>0){var l={trigger:o.observable(null)};h.current.complete(function(){t.init&&t.init(e,n,i,s,c),t.update&&(o.utils.domData.set(e,r,t),l.trigger("trigger"))}),o.utils.domData.set(e,r,l)}else o.utils.domData.set(e,r,t),t.init&&t.init(e,n,i,s,c);return a(e,n,i,s,c)},update:function(e,t,a,n,i){var s=o.utils.domData.get(e,r);return s.update?s.update(e,t,a,n,i):(s.trigger&&s.trigger(),void 0)}};for(n in t)"init"!==n&&"update"!==n&&(i[n]=t[n])},getParts:function(e,t,a){if(t=t||{},!e)return t;void 0===e.length&&(e=[e]);for(var n=0,i=e.length;i>n;n++){var r=e[n];if(r.getAttribute){if(!a&&T(r))continue;var o=r.getAttribute(S);o&&(t[o]=r),!a&&r.hasChildNodes()&&h.getParts(r.childNodes,t)}}return t},cloneNodes:v,finalize:function(t){if(void 0===t.transition&&(t.transition=this.defaultTransitionName),t.child||t.activeView)if(m(t)){var n=this.convertTransitionToModuleId(t.transition);e.acquire(n).then(function(e){t.transition=e,e(t).then(function(){if(t.cacheViews){if(t.activeView){var e=a.getBindingInstruction(t.activeView);e&&void 0!=e.cacheViews&&!e.cacheViews&&o.removeNode(t.activeView)}}else t.child?y(t):o.virtualElements.emptyNode(t.parent);t.triggerAttach(),c(),l(t)})}).fail(function(t){e.error("Failed to load transition ("+n+"). Details: "+t.message)})}else{if(t.child!=t.activeView){if(t.cacheViews&&t.activeView){var i=a.getBindingInstruction(t.activeView);!i||void 0!=i.cacheViews&&!i.cacheViews?o.removeNode(t.activeView):f(t.activeView)}t.child?(t.cacheViews||y(t),g(t.child)):t.cacheViews||o.virtualElements.emptyNode(t.parent)}t.triggerAttach(),c(),l(t)}else t.cacheViews||o.virtualElements.emptyNode(t.parent),t.triggerAttach(),c(),l(t)},bindAndShow:function(e,t,i){t.child=e,t.composingNewView=t.cacheViews?-1==o.utils.arrayIndexOf(t.viewElements,e):!0,u(t,function(){if(t.binding&&t.binding(t.child,t.parent,t),t.preserveContext&&t.bindingContext)t.composingNewView&&(t.parts&&p(t),f(e),o.virtualElements.prepend(t.parent,e),a.bindContext(t.bindingContext,e,t.model));else if(e){var i=t.model||E,r=o.dataFor(e);if(r!=i){if(!t.composingNewView)return o.removeNode(e),n.createView(e.getAttribute("data-view")).then(function(e){h.bindAndShow(e,t,!0)}),void 0;t.parts&&p(t),f(e),o.virtualElements.prepend(t.parent,e),a.bind(i,e)}}h.finalize(t)},i)},defaultStrategy:function(e){return t.locateViewForObject(e.model,e.area,e.viewElements)},getSettings:function(t){var a,r=t(),s=o.utils.unwrapObservable(r)||{},c=i.isActivator(r);if(e.isString(s))return s=n.isViewUrl(s)?{view:s}:{model:s,activate:!0};if(a=e.getModuleId(s))return s={model:s,activate:!0};!c&&s.model&&(c=i.isActivator(s.model));for(var l in s)s[l]=-1!=o.utils.arrayIndexOf(N,l)?o.utils.unwrapObservable(s[l]):s[l];return c?s.activate=!1:void 0===s.activate&&(s.activate=!0),s},executeStrategy:function(e){e.strategy(e).then(function(t){h.bindAndShow(t,e)})},inject:function(a){return a.model?a.view?(t.locateView(a.view,a.area,a.viewElements).then(function(e){h.bindAndShow(e,a)}),void 0):(a.strategy||(a.strategy=this.defaultStrategy),e.isString(a.strategy)?e.acquire(a.strategy).then(function(e){a.strategy=e,h.executeStrategy(a)}).fail(function(t){e.error("Failed to load view strategy ("+a.strategy+"). Details: "+t.message)}):this.executeStrategy(a),void 0):(this.bindAndShow(null,a),void 0)},compose:function(a,n,i,r){A++,r||(n=h.getSettings(function(){return n},a)),n.compositionComplete&&b.push(function(){n.compositionComplete(n.child,n.parent,n)}),b.push(function(){n.composingNewView&&n.model&&n.model.compositionComplete&&n.model.compositionComplete(n.child,n.parent,n)});var o=s(a);n.activeView=o.activeView,n.parent=a,n.triggerAttach=d,n.bindingContext=i,n.cacheViews&&!n.viewElements&&(n.viewElements=o.childElements),n.model?e.isString(n.model)?e.acquire(n.model).then(function(t){n.model=e.resolveObject(t),h.inject(n)}).fail(function(t){e.error("Failed to load composed module ("+n.model+"). Details: "+t.message)}):h.inject(n):n.view?(n.area=n.area||"partial",n.preserveContext=!0,t.locateView(n.view,n.area,n.viewElements).then(function(e){h.bindAndShow(e,n)})):this.bindAndShow(null,n)}},o.bindingHandlers.compose={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,a,i,r){var s=h.getSettings(t,e);if(s.mode){var c=o.utils.domData.get(e,w);if(!c){var l=o.virtualElements.childNodes(e);c={},"inline"===s.mode?c.view=n.ensureSingleElement(l):"templated"===s.mode&&(c.parts=v(l)),o.virtualElements.emptyNode(e),o.utils.domData.set(e,w,c)}"inline"===s.mode?s.view=c.view.cloneNode(!0):"templated"===s.mode&&(s.parts=c.parts),s.preserveContext=!0}h.compose(e,s,r,!0)}},o.virtualElements.allowedBindings.compose=!0,h});
define('durandal/events',["durandal/system"],function(e){var t=/\s+/,a=function(){},n=function(e,t){this.owner=e,this.events=t};return n.prototype.then=function(e,t){return this.callback=e||this.callback,this.context=t||this.context,this.callback?(this.owner.on(this.events,this.callback,this.context),this):this},n.prototype.on=n.prototype.then,n.prototype.off=function(){return this.owner.off(this.events,this.callback,this.context),this},a.prototype.on=function(e,a,i){var r,o,s;if(a){for(r=this.callbacks||(this.callbacks={}),e=e.split(t);o=e.shift();)s=r[o]||(r[o]=[]),s.push(a,i);return this}return new n(this,e)},a.prototype.off=function(a,n,i){var r,o,s,c;if(!(o=this.callbacks))return this;if(!(a||n||i))return delete this.callbacks,this;for(a=a?a.split(t):e.keys(o);r=a.shift();)if((s=o[r])&&(n||i))for(c=s.length-2;c>=0;c-=2)n&&s[c]!==n||i&&s[c+1]!==i||s.splice(c,2);else delete o[r];return this},a.prototype.trigger=function(e){var a,n,i,r,o,s,c,l;if(!(n=this.callbacks))return this;for(l=[],e=e.split(t),r=1,o=arguments.length;o>r;r++)l[r-1]=arguments[r];for(;a=e.shift();){if((c=n.all)&&(c=c.slice()),(i=n[a])&&(i=i.slice()),i)for(r=0,o=i.length;o>r;r+=2)i[r].apply(i[r+1]||this,l);if(c)for(s=[a].concat(l),r=0,o=c.length;o>r;r+=2)c[r].apply(c[r+1]||this,s)}return this},a.prototype.proxy=function(e){var t=this;return function(a){t.trigger(e,a)}},a.includeIn=function(e){e.on=a.prototype.on,e.off=a.prototype.off,e.trigger=a.prototype.trigger,e.proxy=a.prototype.proxy},a});
define('durandal/app',["durandal/system","durandal/viewEngine","durandal/composition","durandal/events","jquery"],function(e,t,a,n,i){function r(){return e.defer(function(t){return 0==s.length?(t.resolve(),void 0):(e.acquire(s).then(function(a){for(var n=0;n<a.length;n++){var i=a[n];if(i.install){var r=c[n];e.isObject(r)||(r={}),i.install(r),e.log("Plugin:Installed "+s[n])}else e.log("Plugin:Loaded "+s[n])}t.resolve()}).fail(function(t){e.error("Failed to load plugin(s). Details: "+t.message)}),void 0)}).promise()}var o,s=[],c=[];return o={title:"Application",configurePlugins:function(t,a){var n=e.keys(t);a=a||"plugins/",-1===a.indexOf("/",a.length-1)&&(a+="/");for(var i=0;i<n.length;i++){var r=n[i];s.push(a+r),c.push(t[r])}},start:function(){return e.log("Application:Starting"),this.title&&(document.title=this.title),e.defer(function(t){i(function(){r().then(function(){t.resolve(),e.log("Application:Started")})})}).promise()},setRoot:function(n,i,r){var o,s={activate:!0,transition:i};o=!r||e.isString(r)?document.getElementById(r||"applicationHost"):r,e.isString(n)?t.isViewUrl(n)?s.view=n:s.model=n:s.model=n,a.compose(o,s)}},n.includeIn(o),o});
requirejs.config({paths:{text:"../Scripts/text",durandal:"../Scripts/durandal",plugins:"../Scripts/durandal/plugins",transitions:"../Scripts/durandal/transitions"},urlArgs:"v=0.0.0.2"}),define("jquery",[],function(){return jQuery}),define("knockout",ko),define('main',["durandal/system","durandal/app","durandal/viewLocator"],function(n,t,e){n.debug(!0),t.title="D&D",t.configurePlugins({router:!0,dialog:!0,widget:!0}),t.start().then(function(){e.useConvention(),t.setRoot("viewmodels/shell","entrance")})});
define('models/config.models',[],function(){function e(e){function a(e){var a=function(e,a){return e.x()==a.x()?e.x()>a.x()?1:-1:e.x()>a.x()?1:-1};e.rows=ko.computed(function(){var t=e.tiles(),n=[],i=[];return ko.utils.arrayForEach(t,function(e){-1===n.indexOf(e.y())&&n.push(e.y())}),ko.utils.arrayForEach(n,function(e){var n=ko.utils.arrayFilter(t,function(a){return e===a.y()}).sort(a);i.push(n)}),i}).extend({throttle:25})}e.addEntityType({shortName:"Item",namespace:"DndSota",autoGeneratedKeyType:breeze.AutoGeneratedKeyType.Identity,dataProperties:{id:{dataType:"Int64",isPartOfKey:!0},name:{dataType:"String"},quantity:{dataType:"Int64"},value:{dataType:"Int64"},canBuy:{dataType:"Boolean"},playerId:{dataType:"Int64"}},navigationProperties:{player:{entityTypeName:"Character",isScalar:!0,associationName:"Character_Items",foreignKeyNames:["playerId"]}}}),e.addEntityType({shortName:"Attribute",namespace:"DndSota",autoGeneratedKeyType:breeze.AutoGeneratedKeyType.Identity,dataProperties:{id:{dataType:"Int64",isPartOfKey:!0},name:{dataType:"String"},value:{dataType:"Int64"}}}),e.addEntityType({shortName:"EnemyType",namespace:"DndSota",autoGeneratedKeyType:breeze.AutoGeneratedKeyType.Identity,dataProperties:{id:{dataType:"Int64",isPartOfKey:!0},name:{dataType:"String"},level:{dataType:"Int64"},hitPoints:{dataType:"Int64"},damage:{dataType:"Int64"},position:{complexTypeName:"Position:#DndSota",isScalar:!0}}}),e.addEntityType({shortName:"Weapon",namespace:"DndSota",autoGeneratedKeyType:breeze.AutoGeneratedKeyType.Identity,dataProperties:{id:{dataType:"Int64",isPartOfKey:!0},name:{dataType:"String"},damage:{dataType:"Int64"},value:{dataType:"Int64"},playerId:{dataType:"Int64"},range:{dataType:"Int64"}},navigationProperties:{player:{entityTypeName:"Character",isScalar:!0,associationName:"Character_Weapons",foreignKeyNames:["playerId"]}}}),e.addEntityType({shortName:"Armor",namespace:"DndSota",autoGeneratedKeyType:breeze.AutoGeneratedKeyType.Identity,dataProperties:{id:{dataType:"Int64",isPartOfKey:!0},name:{dataType:"String"},defense:{dataType:"Int64"},value:{dataType:"Int64"}}}),e.addEntityType({shortName:"ClassType",namespace:"DndSota",autoGeneratedKeyType:breeze.AutoGeneratedKeyType.Identity,dataProperties:{id:{dataType:"Int64",isPartOfKey:!0},name:{dataType:"String"},startingGold:{dataType:"Int64"}}}),e.addEntityType({shortName:"Map",namespace:"DndSota",autoGeneratedKeyType:breeze.AutoGeneratedKeyType.Identity,dataProperties:{id:{dataType:"Int64",isPartOfKey:!0},name:{dataType:"String"}},navigationProperties:{tiles:{entityTypeName:"Tile",isScalar:!1,associationName:"Map_Tiles"}}}),e.addEntityType({shortName:"Tile",namespace:"DndSota",autoGeneratedKeyType:breeze.AutoGeneratedKeyType.Identity,dataProperties:{id:{dataType:"Int64",isPartOfKey:!0},name:{dataType:"String"},mapId:{dataType:"Int64"},occupied:{dataType:"Boolean"},x:{dataType:"Int64"},y:{dataType:"Int64"},image:{dataType:"String"},item:{complexTypeName:"TileItem:#DndSota",isScalar:!0},enemy:{complexTypeName:"TileEnemy:#DndSota",isScalar:!0}},navigationProperties:{map:{entityTypeName:"Map",isScalar:!0,associationName:"Map_Tiles",foreignKeyNames:["mapId"]}}}),e.addEntityType({shortName:"TileType",namespace:"DndSota",autoGeneratedKeyType:breeze.AutoGeneratedKeyType.Identity,dataProperties:{id:{dataType:"Int64",isPartOfKey:!0},name:{dataType:"String"},image:{dataType:"String"},designerImage:{dataType:"String"}}}),e.addEntityType({shortName:"Position",namespace:"DndSota",isComplexType:!0,dataProperties:{x:{dataType:"Int64"},y:{dataType:"Int64"}}}),e.addEntityType({shortName:"TileItem",namespace:"DndSota",isComplexType:!0,dataProperties:{id:{dataType:"Int64"},name:{dataType:"String"},value:{dataType:"Int64"}}}),e.addEntityType({shortName:"TileEnemy",namespace:"DndSota",isComplexType:!0,dataProperties:{id:{dataType:"Int64"},name:{dataType:"String"},hitPoints:{dataType:"Int64"},damage:{dataType:"Int64"},position:{complexTypeName:"Position:#DndSota",isScalar:!0}}}),e.addEntityType({shortName:"Character",namespace:"DndSota",autoGeneratedKeyType:breeze.AutoGeneratedKeyType.Identity,dataProperties:{id:{dataType:"Int64",isPartOfKey:!0},name:{dataType:"String"},gold:{dataType:"Int64"},strength:{dataType:"Int64"},dexterity:{dataType:"Int64"},constitution:{dataType:"Int64"},charisma:{dataType:"Int64"},wisdom:{dataType:"Int64"},intellect:{dataType:"Int64"},hitPoints:{dataType:"Int64"},classTypeId:{dataType:"Int64"},weaponId:{dataType:"Int64"},position:{complexTypeName:"Position:#DndSota",isScalar:!0}},navigationProperties:{classType:{entityTypeName:"ClassType",isScalar:!0,associationName:"Character_ClassType",foreignKeyNames:["classTypeId"]},weapon:{entityTypeName:"Weapon",isScalar:!0,associationName:"Character_Weapon",foreignKeyNames:["weaponId"]},weapons:{entityTypeName:"Weapon",isScalar:!1,associationName:"Character_Weapons"},items:{entityTypeName:"Item",isScalar:!1,associationName:"Character_Items"}}}),e.registerEntityTypeCtor("Map",null,a)}breeze.DataType;var a={initialize:e};return a});
define('services/bindings',[],function(){ko.bindingHandlers.returnAction={init:function(e,a,t,n){var i=ko.utils.unwrapObservable(a());$(e).keydown(function(e){13===e.which&&i(n)})}}});
define('services/datacontext',["models/config.models"],function(e){function a(e,a){var t=m.from("Maps").toType("Map").where("id","==",a);return thisMap=I.executeQueryLocally(t),e(thisMap[0])}function t(e,a,t,n){var i=new l("x","==",a),r=new l("y","==",t),y=new l("mapId","==",n),o=i.and(r,y),d=m.from("Tiles").toType("Tile").where(o),p=I.executeQueryLocally(d);return e?e(p[0]):p[0]}function n(){function e(){var e=I.exportEntities(null,!1);i(e)}var a=m.from("Maps").where("id","!=",1).using(I).toType("Map").executeLocally();e(a)}function i(e){window.localStorage.setItem("dnd-sota",e)}function r(e){e.entityAspect.acceptChanges()}function y(e){var a=new l("image","==","U"),t=new l("mapId","==",e),n=t.and(a),i=m.from("Tiles").toType("Tile").where(n),r=I.executeQueryLocally(i);return r[0]}function o(e){var a=new l("image","==","@"),t=new l("mapId","==",e),n=t.and(a),i=m.from("Tiles").toType("Tile").where(n),r=I.executeQueryLocally(i);return r[0]}function d(e,a,t){var n=T("Position",{x:a,y:t});e.position(n)}function p(e,a,t){var n=T("Position",{x:a,y:t});e.position(n)}function s(e,a){var t=I.createEntity(e,a);return t.entityAspect.acceptChanges(),t}function T(e,a){var t=I.metadataStore.getEntityType(e),n=t.createInstance(a);return n}function c(){breeze.NamingConvention.camelCase.setAsDefault(),breeze.config.initializeAdapterInstance("ajax","jQuery",!0);var a=new breeze.EntityManager({dataService:u});return e.initialize(a.metadataStore),a}var m=breeze.EntityQuery,l=breeze.Predicate,u=new breeze.DataService({adapterName:"webApi",serviceName:"api/breeze",hasServerMetadata:!1}),I=c();I.metadataStore;var f={createEntity:s,createComplexType:T,saveEntity:r,getTileByCoord:t,getMap:a,createPlayerPosition:d,createEnemyPosition:p,findPlayerStart:y,findEnemy:o,saveMapsAndTiles:n};return f});
define('services/map.creator',["services/datacontext"],function(e){function a(a){for(var t=a.layout,n=1,i=1,r=1,y=0;y<t.length;y++){var d=t.charAt(y);if("*"===d)e.createEntity("Tile",{name:"Tile",mapId:a.id,occupied:!0,x:n,y:i,image:"*"}),n+=1;else if("."===d)e.createEntity("Tile",{name:"Tile",mapId:a.id,occupied:!1,x:n,y:i,image:" "}),n+=1;else if("U"===d)e.createEntity("Tile",{name:"Tile",mapId:a.id,occupied:!0,x:n,y:i,image:"U"}),n+=1;else if("$"===d){var d=e.createEntity("Tile",{name:"Tile",mapId:a.id,occupied:!1,x:n,y:i,image:"$"}),o=e.createComplexType("TileItem",{id:r,name:"GOLD",value:10});d.item(o),r+=1,n+=1}else if("E"===d){var d=e.createEntity("Tile",{name:"Tile",mapId:a.id,occupied:!1,x:n,y:i,image:"@"});n+=1}else if("D"===d){var d=e.createEntity("Tile",{name:"Tile",mapId:a.id,occupied:!0,x:n,y:i,image:"D"}),o=e.createComplexType("TileItem",{id:r,name:"DOOR"});d.item(o),r+=1,n+=1}else","===d&&(n=1,i+=1)}e.createEntity("Map",{id:a.id,name:a.name})}var t={createMap:a};return t});
define('services/game.objects',["services/datacontext","services/map.creator"],function(e,a){var t=ko.observableArray([e.createEntity("Weapon",{id:1,name:"SWORD",damage:5,value:10,range:1}),e.createEntity("Weapon",{id:2,name:"2-H-SWORD",damage:5,value:15,range:1}),e.createEntity("Weapon",{id:3,name:"DAGGER",damage:3,value:3,range:3}),e.createEntity("Weapon",{id:4,name:"MACE",damage:6,value:15,range:1}),e.createEntity("Weapon",{id:5,name:"SPEAR",damage:7,value:15,range:5}),e.createEntity("Weapon",{id:6,name:"BOW",damage:3,value:15,range:5})]),n=ko.observableArray([e.createEntity("EnemyType",{id:1,image:"G",name:"GOBLIN",level:1,hitPoints:13,damage:5,value:500,range:1}),e.createEntity("EnemyType",{id:2,image:"T",name:"TROLL",level:1,hitPoints:15,damage:5,value:1e3,range:1}),e.createEntity("EnemyType",{id:3,image:"S",name:"SKELETON",level:1,hitPoints:22,damage:5,value:50,range:1}),e.createEntity("EnemyType",{id:4,image:"B",name:"BALROG",level:1,hitPoints:18,damage:5,value:5e3,range:1}),e.createEntity("EnemyType",{id:5,image:"J",name:"OCHRE JELLY",level:1,hitPoints:11,damage:5,value:0,range:1}),e.createEntity("EnemyType",{id:6,image:"O",name:"GREY OOZE",level:1,hitPoints:11,damage:5,value:0,range:1}),e.createEntity("EnemyType",{id:7,image:"N",name:"GNOME",level:1,hitPoints:13,damage:5,value:100,range:1}),e.createEntity("EnemyType",{id:8,image:"K",name:"KOBOLD",level:1,hitPoints:15,damage:5,value:500,range:1}),e.createEntity("EnemyType",{id:9,image:"M",name:"MUMMY",level:1,hitPoints:16,damage:5,value:100,range:1})]),i=ko.observableArray([e.createEntity("Armor",{name:"LEATHER MAIL",defense:1,value:15}),e.createEntity("Armor",{name:"CHAIN MAIL",defense:1,value:30}),e.createEntity("Armor",{name:"TLTE MAIL",defense:1,value:50})]),r=ko.observableArray([e.createEntity("TileType",{name:"WALL",designerImage:"*",image:"*"}),e.createEntity("TileType",{name:"EMPTY",designerImage:".",image:" "}),e.createEntity("TileType",{name:"GOLD",designerImage:"$",image:"$"}),e.createEntity("TileType",{name:"ENEMY",designerImage:"E",image:"E"}),e.createEntity("TileType",{name:"DOOR",designerImage:"D",image:"D"}),e.createEntity("TileType",{name:"LINE END",designerImage:",",image:" "})]),y=ko.observableArray([e.createEntity("ClassType",{name:"FIGHTER",startingGold:8}),e.createEntity("ClassType",{name:"CLERIC",startingGold:4}),e.createEntity("ClassType",{name:"WIZARD",startingGold:6})]),d=ko.observableArray([e.createEntity("Attribute",{name:"STRENGTH"}),e.createEntity("Attribute",{name:"DEXTERITY"}),e.createEntity("Attribute",{name:"CON"}),e.createEntity("Attribute",{name:"CHAR"}),e.createEntity("Attribute",{name:"WISDOM"}),e.createEntity("Attribute",{name:"INTELLECT"})]),o=ko.observableArray([e.createEntity("Item",{id:7,name:"ROPE",value:1,canBuy:!0}),e.createEntity("Item",{id:8,name:"SPIKES",value:1,canBuy:!0}),e.createEntity("Item",{id:9,name:"FLASK OF OIL",value:2,canBuy:!0}),e.createEntity("Item",{id:10,name:"SILVER CROSS",value:25,canBuy:!0}),e.createEntity("Item",{id:11,name:"SPARE FOOD",value:5,canBuy:!0}),e.createEntity("Item",{id:12,name:"ARROWS",value:15,quantity:15,canBuy:!0}),e.createEntity("Item",{id:13,name:"GOLD",value:25,canBuy:!1}),e.createEntity("Item",{id:14,name:"DOOR",value:0,canBuy:!1})]);o()[6];var p=ko.observableArray([e.createEntity("Map",{id:1,name:"DND1"})]),s={id:5,name:"First map test",layout:"*******,*U    *,*     *,*** ***,*     *,*     *,*******"},m={id:3,name:"Third",layout:"*******,*U    *,*    $*,*** ***,*     *,*    $*,*******"},c={id:2,name:"Second",layout:"**************,*U...........*,*......E....$*,**D***..******,D............*,*....E......$*,*..***********,*....****....*,*....****....*,*............*,**************"},T={id:4,name:"Fourth map",layout:"***************................*************************,*.U...........*................*.......................*,*.............*................*.......................*,*........E....*................*.......................*,*.............*.........E......*.......................*,*.............*................*.......................*,*.............******************.......................*,*........................*$............................*,*............$...........*.............................*,****************.........*...........*****************D*,*..............*.........D...........*...............E.*,*..............*.........*...........*...E.............*,*.............ED.........*...........*.................*,*$$$...........*.........*.....E.....*.........E.......*,*$$$...........*.........*...........*.......$.........*,********************************************************,"};a.createMap(s),a.createMap(c),a.createMap(m),a.createMap(T);var l={weapons:t,armors:i,classTypes:y,attributes:d,items:o,maps:p,tileTypes:r,enemyTypes:n,mapCreator:a};return l});
define('services/session',[],function(){var e=ko.observable(),a=ko.observable(),t={currentUser:e,currentPlayer:a};return t});
define('viewmodels/about',[],function(){function e(){console.log("About activated")}var a={activate:e};return a});
define('plugins/history',["durandal/system","jquery"],function(e,t){function a(e,t,a){if(a){var n=e.href.replace(/(javascript:|#).*$/,"");e.replace(n+"#"+t)}else e.hash="#"+t}var n=/^[#\/]|\s+$/g,i=/^\/+|\/+$/g,r=/msie [\w.]+/,o=/\/$/,s={interval:50,active:!1};return"undefined"!=typeof window&&(s.location=window.location,s.history=window.history),s.getHash=function(e){var t=(e||s).location.href.match(/#(.*)$/);return t?t[1]:""},s.getFragment=function(e,t){if(null==e)if(s._hasPushState||!s._wantsHashChange||t){e=s.location.pathname+s.location.search;var a=s.root.replace(o,"");e.indexOf(a)||(e=e.substr(a.length))}else e=s.getHash();return e.replace(n,"")},s.activate=function(a){s.active&&e.error("History has already been activated."),s.active=!0,s.options=e.extend({},{root:"/"},s.options,a),s.root=s.options.root,s._wantsHashChange=s.options.hashChange!==!1,s._wantsPushState=!!s.options.pushState,s._hasPushState=!!(s.options.pushState&&s.history&&s.history.pushState);var o=s.getFragment(),c=document.documentMode,l=r.exec(navigator.userAgent.toLowerCase())&&(!c||7>=c);s.root=("/"+s.root+"/").replace(i,"/"),l&&s._wantsHashChange&&(s.iframe=t('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo("body")[0].contentWindow,s.navigate(o,!1)),s._hasPushState?t(window).on("popstate",s.checkUrl):s._wantsHashChange&&"onhashchange"in window&&!l?t(window).on("hashchange",s.checkUrl):s._wantsHashChange&&(s._checkUrlInterval=setInterval(s.checkUrl,s.interval)),s.fragment=o;var u=s.location,d=u.pathname.replace(/[^\/]$/,"$&/")===s.root;if(s._wantsHashChange&&s._wantsPushState){if(!s._hasPushState&&!d)return s.fragment=s.getFragment(null,!0),s.location.replace(s.root+s.location.search+"#"+s.fragment),!0;s._hasPushState&&d&&u.hash&&(this.fragment=s.getHash().replace(n,""),this.history.replaceState({},document.title,s.root+s.fragment+u.search))}return s.options.silent?void 0:s.loadUrl()},s.deactivate=function(){t(window).off("popstate",s.checkUrl).off("hashchange",s.checkUrl),clearInterval(s._checkUrlInterval),s.active=!1},s.checkUrl=function(){var e=s.getFragment();return e===s.fragment&&s.iframe&&(e=s.getFragment(s.getHash(s.iframe))),e===s.fragment?!1:(s.iframe&&s.navigate(e,!1),s.loadUrl(),void 0)},s.loadUrl=function(e){var t=s.fragment=s.getFragment(e);return s.options.routeHandler?s.options.routeHandler(t):!1},s.navigate=function(t,n){if(!s.active)return!1;if(void 0===n?n={trigger:!0}:e.isBoolean(n)&&(n={trigger:n}),t=s.getFragment(t||""),s.fragment!==t){s.fragment=t;var i=s.root+t;if(""===t&&"/"!==i&&(i=i.slice(0,-1)),s._hasPushState)s.history[n.replace?"replaceState":"pushState"]({},document.title,i);else{if(!s._wantsHashChange)return s.location.assign(i);a(s.location,t,n.replace),s.iframe&&t!==s.getFragment(s.getHash(s.iframe))&&(n.replace||s.iframe.document.open().close(),a(s.iframe.location,t,n.replace))}return n.trigger?s.loadUrl(t):void 0}},s.navigateBack=function(){s.history.back()},s});
define('plugins/router',["durandal/system","durandal/app","durandal/activator","durandal/events","durandal/composition","plugins/history","knockout","jquery"],function(e,t,n,a,i,r,o,s){function c(e){return e=e.replace(y,"\\$&").replace(v,"(?:$1)?").replace(m,function(e,t){return t?e:"([^/]+)"}).replace(g,"(.*?)"),new RegExp("^"+e+"$")}function u(e){var t=e.indexOf(":"),n=t>0?t-1:e.length;return e.substring(0,n)}function l(e,t){return-1!==e.indexOf(t,e.length-t.length)}function d(e,t){if(!e||!t)return!1;if(e.length!=t.length)return!1;for(var n=0,a=e.length;a>n;n++)if(e[n]!=t[n])return!1;return!0}var f,p,v=/\((.*?)\)/g,m=/(\(\?)?:\w+/g,g=/\*\w+/g,y=/[\-{}\[\]+?.,\\\^$|#\s]/g,h=/\/$/,T=function(){function i(e){return e.router&&e.router.parent==M}function s(e){D&&D.config.isActive&&D.config.isActive(e)}function v(t,n){e.log("Navigation Complete",t,n);var a=e.getModuleId(N);a&&M.trigger("router:navigation:from:"+a),N=t,s(!1),D=n,s(!0);var r=e.getModuleId(N);r&&M.trigger("router:navigation:to:"+r),i(t)||M.updateDocumentTitle(t,n),p.explicitNavigation=!1,p.navigatingBack=!1,M.trigger("router:navigation:complete",t,n,M)}function m(t,n){e.log("Navigation Cancelled"),M.activeInstruction(D),D&&M.navigate(D.fragment,!1),k(!1),p.explicitNavigation=!1,p.navigatingBack=!1,M.trigger("router:navigation:cancelled",t,n,M)}function g(t){e.log("Navigation Redirecting"),k(!1),p.explicitNavigation=!1,p.navigatingBack=!1,M.navigate(t,{trigger:!0,replace:!0})}function y(t,n,a){p.navigatingBack=!p.explicitNavigation&&N!=a.fragment,M.trigger("router:route:activating",n,a,M),t.activateItem(n,a.params).then(function(e){if(e){var r=N;if(v(n,a),i(n)){var o=a.fragment;a.queryString&&(o+="?"+a.queryString),n.router.loadUrl(o)}r==n&&(M.attached(),M.compositionComplete())}else t.settings.lifecycleData&&t.settings.lifecycleData.redirect?g(t.settings.lifecycleData.redirect):m(n,a);f&&(f.resolve(),f=null)}).fail(function(t){e.error(t)})}function b(t,n,a){var i=M.guardRoute(n,a);i?i.then?i.then(function(i){i?e.isString(i)?g(i):y(t,n,a):m(n,a)}):e.isString(i)?g(i):y(t,n,a):m(n,a)}function I(e,t,n){M.guardRoute?b(e,t,n):y(e,t,n)}function w(e){return D&&D.config.moduleId==e.config.moduleId&&N&&(N.canReuseForRoute&&N.canReuseForRoute.apply(N,e.params)||!N.canReuseForRoute&&N.router&&N.router.loadUrl)}function E(){if(!k()){var t=C.shift();C=[],t&&(k(!0),M.activeInstruction(t),w(t)?I(n.create(),N,t):e.acquire(t.config.moduleId).then(function(n){var a=e.resolveObject(n);I(P,a,t)}).fail(function(n){e.error("Failed to load routed module ("+t.config.moduleId+"). Details: "+n.message)}))}}function A(e){C.unshift(e),E()}function S(e,t,n){for(var a=e.exec(t).slice(1),i=0;i<a.length;i++){var r=a[i];a[i]=r?decodeURIComponent(r):null}var o=M.parseQueryString(n);return o&&a.push(o),{params:a,queryParams:o}}function x(t){M.trigger("router:route:before-config",t,M),e.isRegExp(t)?t.routePattern=t.route:(t.title=t.title||M.convertRouteToTitle(t.route),t.moduleId=t.moduleId||M.convertRouteToModuleId(t.route),t.hash=t.hash||M.convertRouteToHash(t.route),t.routePattern=c(t.route)),t.isActive=t.isActive||o.observable(!1),M.trigger("router:route:after-config",t,M),M.routes.push(t),M.route(t.routePattern,function(e,n){var a=S(t.routePattern,e,n);A({fragment:e,queryString:n,config:t,params:a.params,queryParams:a.queryParams})})}function O(t){if(e.isArray(t.route))for(var n=t.isActive||o.observable(!1),a=0,i=t.route.length;i>a;a++){var r=e.extend({},t);r.route=t.route[a],r.isActive=n,a>0&&delete r.nav,x(r)}else x(t);return M}var N,D,C=[],k=o.observable(!1),P=n.create(),M={handlers:[],routes:[],navigationModel:o.observableArray([]),activeItem:P,isNavigating:o.computed(function(){var e=P(),t=k(),n=e&&e.router&&e.router!=M&&e.router.isNavigating()?!0:!1;return t||n}),activeInstruction:o.observable(null),__router__:!0};return a.includeIn(M),P.settings.areSameItem=function(e,t,n,a){return e==t?d(n,a):!1},M.parseQueryString=function(e){var t,n;if(!e)return null;if(n=e.split("&"),0==n.length)return null;t={};for(var a=0;a<n.length;a++){var i=n[a];if(""!==i){var r=i.split("=");t[r[0]]=r[1]&&decodeURIComponent(r[1].replace(/\+/g," "))}}return t},M.route=function(e,t){M.handlers.push({routePattern:e,callback:t})},M.loadUrl=function(t){var n=M.handlers,a=null,i=t,o=t.indexOf("?");if(-1!=o&&(i=t.substring(0,o),a=t.substr(o+1)),M.relativeToParentRouter){var s=this.parent.activeInstruction();i=s.params.join("/"),i&&"/"==i.charAt(0)&&(i=i.substr(1)),i||(i=""),i=i.replace("//","/").replace("//","/")}i=i.replace(h,"");for(var c=0;c<n.length;c++){var u=n[c];if(u.routePattern.test(i))return u.callback(i,a),!0}return e.log("Route Not Found"),M.trigger("router:route:not-found",t,M),D&&r.navigate(D.fragment,{trigger:!1,replace:!0}),p.explicitNavigation=!1,p.navigatingBack=!1,!1},M.updateDocumentTitle=function(e,n){n.config.title?document.title=t.title?n.config.title+" | "+t.title:n.config.title:t.title&&(document.title=t.title)},M.navigate=function(e,t){return e&&-1!=e.indexOf("://")?(window.location.href=e,!0):(p.explicitNavigation=!0,r.navigate(e,t))},M.navigateBack=function(){r.navigateBack()},M.attached=function(){M.trigger("router:navigation:attached",N,D,M)},M.compositionComplete=function(){k(!1),M.trigger("router:navigation:composition-complete",N,D,M),E()},M.convertRouteToHash=function(e){if(M.relativeToParentRouter){var t=M.parent.activeInstruction(),n=t.config.hash+"/"+e;return r._hasPushState&&(n="/"+n),n=n.replace("//","/").replace("//","/")}return r._hasPushState?e:"#"+e},M.convertRouteToModuleId=function(e){return u(e)},M.convertRouteToTitle=function(e){var t=u(e);return t.substring(0,1).toUpperCase()+t.substring(1)},M.map=function(t,n){if(e.isArray(t)){for(var a=0;a<t.length;a++)M.map(t[a]);return M}return e.isString(t)||e.isRegExp(t)?(n?e.isString(n)&&(n={moduleId:n}):n={},n.route=t):n=t,O(n)},M.buildNavigationModel=function(t){for(var n=[],a=M.routes,i=t||100,r=0;r<a.length;r++){var o=a[r];o.nav&&(e.isNumber(o.nav)||(o.nav=++i),n.push(o))}return n.sort(function(e,t){return e.nav-t.nav}),M.navigationModel(n),M},M.mapUnknownRoutes=function(t,n){var a="*catchall",i=c(a);return M.route(i,function(o,s){var c=S(i,o,s),u={fragment:o,queryString:s,config:{route:a,routePattern:i},params:c.params,queryParams:c.queryParams};if(t)if(e.isString(t))u.config.moduleId=t,n&&r.navigate(n,{trigger:!1,replace:!0});else if(e.isFunction(t)){var l=t(u);if(l&&l.then)return l.then(function(){M.trigger("router:route:before-config",u.config,M),M.trigger("router:route:after-config",u.config,M),A(u)}),void 0}else u.config=t,u.config.route=a,u.config.routePattern=i;else u.config.moduleId=o;M.trigger("router:route:before-config",u.config,M),M.trigger("router:route:after-config",u.config,M),A(u)}),M},M.reset=function(){return D=N=void 0,M.handlers=[],M.routes=[],M.off(),delete M.options,M},M.makeRelative=function(t){return e.isString(t)&&(t={moduleId:t,route:t}),t.moduleId&&!l(t.moduleId,"/")&&(t.moduleId+="/"),t.route&&!l(t.route,"/")&&(t.route+="/"),t.fromParent&&(M.relativeToParentRouter=!0),M.on("router:route:before-config").then(function(e){t.moduleId&&(e.moduleId=t.moduleId+e.moduleId),t.route&&(e.route=""===e.route?t.route.substring(0,t.route.length-1):t.route+e.route)}),M},M.createChildRouter=function(){var e=T();return e.parent=M,e},M};return p=T(),p.explicitNavigation=!1,p.navigatingBack=!1,p.targetIsThisWindow=function(e){var t=s(e.target).attr("target");return!t||t===window.name||"_self"===t||"top"===t&&window===window.top?!0:!1},p.activate=function(t){return e.defer(function(n){if(f=n,p.options=e.extend({routeHandler:p.loadUrl},p.options,t),r.activate(p.options),r._hasPushState)for(var a=p.routes,i=a.length;i--;){var o=a[i];o.hash=o.hash.replace("#","")}s(document).delegate("a","click",function(e){if(r._hasPushState){if(!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&p.targetIsThisWindow(e)){var t=s(this).attr("href");null==t||"#"===t.charAt(0)||/^[a-z]+:/i.test(t)||(p.explicitNavigation=!0,e.preventDefault(),r.navigate(t))}}else p.explicitNavigation=!0}),r.options.silent&&f&&(f.resolve(),f=null)}).promise()},p.deactivate=function(){r.deactivate()},p.install=function(){o.bindingHandlers.router={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,a,r){var s=o.utils.unwrapObservable(t())||{};if(s.__router__)s={model:s.activeItem(),attached:s.attached,compositionComplete:s.compositionComplete,activate:!1};else{var c=o.utils.unwrapObservable(s.router||a.router)||p;s.model=c.activeItem(),s.attached=c.attached,s.compositionComplete=c.compositionComplete,s.activate=!1}i.compose(e,s,r)}},o.virtualElements.allowedBindings.router=!0},p});
define('viewmodels/gameStart/character.create',["services/session","services/game.objects","plugins/router","services/datacontext"],function(e,a,t,n){function i(){m(!0)}function r(){if(d()&&d().name()){if("shavs"===d().name().toLowerCase())return n.saveEntity(d()),s(2),m(!1),c(!0),d().strength(o(15,15)),d().dexterity(o(15,15)),d().constitution(o(15,15)),d().charisma(o(15,15)),d().wisdom(o(15,15)),d().intellect(o(15,15)),d().gold(15*o(15,15)),d().hitPoints(o(8,8)),!0;n.saveEntity(d()),s(2),m(!1),c(!0),d().strength(o(1,15)),d().dexterity(o(1,15)),d().constitution(o(1,15)),d().charisma(o(1,15)),d().wisdom(o(1,15)),d().intellect(o(1,15)),d().gold(15*o(10,15)),d().hitPoints(o(2,8))}}function o(e,a){return Math.random()*(a-e)+e}function y(){if(!d()||!l())return c(!0),!1;var i=ko.utils.arrayFirst(a.classTypes(),function(e){return e.name().toLowerCase()===l().toLowerCase()});return i?(d().classType(i),n.saveEntity(d()),e.currentPlayer(d()),t.navigate("purchase")):(l(null),void 0)}var d=ko.observable(),s=ko.observable(0),p=!1,m=ko.observable(!1),c=ko.observable(!1),l=ko.observable(),u=function(){p||(d(n.createEntity("Character",{})),s(1)),m.subscribe(function(){m(!0)})},T=ko.computed(function(){var e="";return ko.utils.arrayForEach(a.classTypes(),function(a){e+=a.name()+", "}),e=e.substring(0,e.length-2)}),g=function(){m(!0)},E={activate:u,compositionComplete:g,classTypesString:T,create:r,addClass:y,focusNameInput:m,focusClassInput:c,focusIt:i,character:d,className:l,state:s};return E});
define('viewmodels/gameStart/designer',["services/session","services/game.objects","plugins/router","services/datacontext"],function(e,a){function t(){console.log("Activating")}function n(){console.log("Attached")}function i(){newMap={id:o(),name:y(),layout:d()},a.mapCreator(newMap),s(!1),d(null),y(null),o(null)}function r(){}var o=ko.observable(),y=ko.observable(),d=ko.observable(),s=ko.observable(!0),p=a.tileTypes,c=ko.computed(function(){return!o()}),m=ko.computed(function(){return!y()}),l=ko.computed(function(){return!c()&&!m()}),u="******,\n*U...*,\n*....*,\n*....*,\n******",T={activate:t,idValue:o,nameValue:y,attached:n,isNew:s,create:i,mapString:d,exampleString:u,nameIsInvalid:m,idIsInvalid:c,save:r,canSave:l,tileTypes:p};return T});
define('viewmodels/gameStart/game',["services/session","services/datacontext","plugins/router"],function(e,t,a){function n(){return G(e.currentPlayer()),G()?(r(),b(),void 0):a.navigate("")}function i(){if(L()){var e=L().toLowerCase();if(B()){var a=parseInt(e);if(!isNaN(a)){var n=G().weapons()[a-1];n?(G().weapon(n),Q("YOU HAVE EQUIPPED A "+n.name())):Q("SORRY YOU DONT HAVE THAT WEAPON"),L(null),B(!1)}}else if(!w()||Y())t.getMap(w,e),r(),b(),Q("ENTER COMMAND"),L(null),Y(!1);else if("right"===e||"r"===e){if(K())return d("r"),!0;L(null),y()}else if("left"===e||"l"===e){if(K())return d("l"),!0;L(null),P()}else if("up"===e||"u"===e){if(K())return d("u"),!0;L(null),o()}else if("down"===e||"d"===e){if(K())return d("d"),!0;L(null),s()}else"2"===e||"open"===e?(L(null),l()):"3"===e||"search"===e?(L(null),m()):"4"===e||"wield"===e?(L(null),h()):"5"===e||"fight"===e?(L(null),f()):"7"===e||"save"===e?(L(null),p()):"8"===e||"cast"===e?(L(null),T()):"9"===e||"buy magic"===e?(L(null),E()):"10"===e||"load"===e?(L(null),O(e)):"11"===e||"buy hp"===e?(L(null),v()):"0"===e||"pass"===e?(L(null),pass()):(Q("COME ON"),L(null))}}function r(){if(w()){var e=t.findPlayerStart(w().id());if(t.createPlayerPosition(G(),e.x(),e.y()),G()){var a=G().position(),n=t.getTileByCoord(null,a.x(),a.y(),w().id());n&&(n.image("U"),n.occupied(!0))}}}function o(){var e=G().position();x(e.x(),e.y()-1)}function s(){var e=G().position();x(e.x(),e.y()+1)}function y(){var e=G().position();x(e.x()+1,e.y())}function l(){Q("DOOR LEFT RIGHT UP OR DOWN"),K(!0)}function d(e){var t=G().position();"d"===e?u(t.x(),t.y()+1):"u"===e?u(t.x(),t.y()-1):"l"===e?u(t.x()-1,t.y()):"r"===e&&u(t.x()+1,t.y())}function u(e,a){if(G()){G().position();var n=t.getTileByCoord(null,e,a,w().id());n&&(c(n)?(M(n),K(!1),L(null)):alert("THERE ISNT A DOOR THERE..."))}}function c(e){return e.item()&&"DOOR"===e.item().name()?!0:!1}function p(){t.saveMapsAndTiles()}function m(){Q("SEARCH.........SEARCH.........SEARCH........."),H(!0)}function T(){Q("MAGIC"),G().weapon()?setTimeout(Q("YOU CANT USE MAGIC WITH WEAPON IN HAND"),100):setTimeout(Q("YOU CANT USE MAGIC WITH WEAPON IN HAND"),100)}function E(){"FIGHTER"===G().classType().name()?setTimeout(Q("YOU CANT BUY ANY"),100):(setTimeout(Q("BUY WHICH"),100),U(!0))}function v(){Q("HOW MANY 200 GP. EACH"),W(!0)}function f(){var e=G().weapon();if(e){Q("YOUR WEAPON IS "+e.name());var t=S(),a=N(),n=A(a,t);if(n>e.range())Q("ENEMY IS TOO FAR AWAY");else if(F(!0),e.range()>1)if("BOW"===e.name()){var i=ko.utils.arrayFirst(G().items(),function(e){return"ARROWS"===e.name()});i&&i.quantity()>0?(g(e),i.quantity(i.quantity()-1)):Q("YOU DONT HAVE ANY ARROWS")}else g(e),G().weapons.remove(g),G().weapon(null);else g(e)}else Q("YOU DONT HAVE A WEAPON IN HAND")}function g(e){var t=V().name();Q(t),setTimeout(function(){Q("HP = "+V().hitPoints())},1500),setTimeout(function(){Q("SWING ")},1500);var a=I(1,2);a=1==a?!0:!1,a?(setTimeout(function(){Q("HIT ENEMY ")},1500),V().hitPoints(V().hitPoints()-e.damage()),V().hitPoints()<1&&(setTimeout(function(){Q("KILLED SKELETON ")},1500),F(!1),k(),b())):setTimeout(function(){Q("MISSED TOTALY")},1500)}function I(e,t){return Math.round(Math.random()*(t-e)+e)}function b(){if(w()){V(t.createComplexType("TileEnemy",{name:"GOBLIN",hitPoints:10,damage:1}));var e=t.findEnemy(w().id());if(e){if(t.createEnemyPosition(V(),e.x(),e.y()),V()){var a=V().position(),n=t.getTileByCoord(null,a.x(),a.y(),w().id());n&&(n.image("E"),n.occupied(!0),n.enemy(V()))}}else console.log("no more monsters"),Q("YOU HAVE CLEARED THE DUNGEON OF MONSTERS")}}function A(e,t){var a=Math.abs(e.x()-t.x()),n=Math.abs(e.y()-t.y()),i=a>n?a:n;return i}function N(){var e;if(G()){var a=G().position();e=t.getTileByCoord(null,a.x(),a.y(),w().id())}return e}function S(){if(V()){var e=V().position(),a=t.getTileByCoord(null,e.x(),e.y(),w().id());return a}return null}function O(){Y(!0),Q("ENTER DUNGEON #")}function h(){Q("WHICH WEAPON WILL YOU HOLD, NUM OF WEAPON"),B(!0)}function P(){var e=G().position();x(e.x()-1,e.y())}function x(e,a){if(G()){var n=G().position(),i=t.getTileByCoord(null,n.x(),n.y(),w().id()),r=t.getTileByCoord(null,e,a,w().id());r&&(D(r)||(M(i),C(r),R(r)))}}function C(e){if(e.item()&&e.item().name()){var t=e.item();Q("FOUND A "+t.name()+" ITEM!"),e.item().id(null),e.item().name(null),e.item().value(null),t.value()&&G().gold(G().gold()+t.value())}else Q("ENTER COMMAND")}function D(e){return e.occupied()}function M(e){e.occupied(!1),e.image(" "),e.item()&&(e.item().id(null),e.item().name(null),e.item().value(null)),e.enemy()&&e.enemy().id()&&(e.enemy().id(null),e.enemy().name(null),e.enemy().hitPoints(null),e.enemy().position().x(null),e.enemy().position().y(null))}function k(){var e=S();M(e)}function R(e){e.occupied(!0),e.image("U"),G().position().x(e.x()),G().position().y(e.y())}var G=ko.observable(),w=ko.observable(),L=ko.observable(),K=ko.observable(),H=ko.observable(),W=ko.observable(),U=ko.observable(),B=ko.observable(),Y=ko.observable(),F=ko.observable(),z=ko.observable(10),$=ko.observable(10),V=ko.observable(),_=["U,D,L,R - MOVE","2 - OPEN DOOR","3 - SEARCH (TRAPS, DOORS)","4 - SWITCH WEAPON","5 - FIGHT","7 - SAVE GAME","8 - USE MAGIC","9 - BUY MAGIC","10 - LOAD DUNGEON","11 - BUY HP","0 - PASS;"],Q=ko.observable("WHICH DUNGEON # (2 - DEFAULT) "),j=ko.observable(!1),q=ko.computed(function(){var e={};if(G()&&w()){var t=G().position(),a=t.y()+Math.ceil(z()/2),n=t.x()-Math.ceil($()/2),i=a-z(),r=n+$(),o=function(e,t){return e.x()==t.x()?e.x()>t.x()?1:-1:e.x()>t.x()?1:-1};e.rows=ko.computed(function(){var e=w().tiles(),t=[],s=[];return ko.utils.arrayForEach(e,function(e){e.y()>=i&&e.y()<=a&&-1===t.indexOf(e.y())&&t.push(e.y())}),ko.utils.arrayForEach(t,function(t){var a=ko.utils.arrayFilter(e,function(e){return e.x()>=n&&e.x()<=r&&t===e.y()}).sort(o);s.push(a)}),s}).extend({throttle:25})}else e.rows=ko.observableArray([]);return e}),J=function(){j(!0)},Z={activate:n,compositionComplete:J,enterCommand:i,focusGameInput:j,gameInput:L,instructions:_,gameMessage:Q,map:w,player:G,centeredMap:q};return Z});
define('viewmodels/gameStart/purchase',["services/session","services/game.objects","plugins/router","services/datacontext"],function(e,t,a,n){function i(){y(e.currentPlayer()),y()||a.navigate("")}function r(){u(1)}function o(){return d()?("FAST"===d()?console.log("IT DOESN'T MATTER WHAT YOU TYPE!"):console.log("IT DOESN'T MATTER WHAT YOU TYPE!"),u(2)):void 0}function s(){if(p()){var e=p().toLowerCase();if(3===u()&&"-1"===e||3===u()&&"done"===e)return a.navigate("game");var t=ko.utils.arrayFirst(T(),function(t){return t.name().toLowerCase()===e});if(!t&&(t=ko.utils.arrayFirst(T(),function(e){return e.id()==p()}),!t))return p(null),!1;if(!(t.value()>y().gold()))return y().items.push(t),y().gold(y().gold()-t.value()),n.saveEntity(y()),p(null),!0;alert("COSTS TOO MUCH TRY AGAIN!")}}function l(){if(c()){var e=c().toLowerCase();("-1"===e||"done"===e)&&u(3);var a=ko.utils.arrayFirst(t.weapons(),function(t){return t.name().toLowerCase()===e});if(!a&&(a=ko.utils.arrayFirst(t.weapons(),function(t){return t.id()==e}),!a))return c(null),!1;if(!(a.value()>y().gold()))return y().weapons.push(a),y().gold(y().gold()-a.value()),n.saveEntity(y()),c(null),!0;alert("COSTS TOO MUCH TRY AGAIN!")}}var y=ko.observable(),u=ko.observable(),d=ko.observable(),c=ko.observable(),p=ko.observable(),m=t.weapons(),T=ko.computed(function(){var e=[];return e=ko.utils.arrayFilter(t.items(),function(e){return e.canBuy()===!0})}),v={player:y,activate:i,attached:r,weaponName:c,itemName:p,fastOrNorm:d,chooseFastOrNorm:o,addWeapon:l,addItem:s,state:u,weaponTypes:m,items:T};return v});
define('viewmodels/home',[],function(){function e(){console.log("Home activated")}var t={activate:e};return t});
define('viewmodels/shell',["plugins/router","durandal/app","services/game.objects","services/bindings"],function(e){function t(){return e.map([{route:"",title:"Game",moduleId:"viewmodels/gameStart/character.create",nav:!0},{route:"home",title:"Home",moduleId:"viewmodels/home"},{route:"about",title:"About",moduleId:"viewmodels/about",nav:!0},{route:"designer",title:"Designer",moduleId:"viewmodels/gameStart/designer",nav:!0},{route:"purchase",title:"Purchase",moduleId:"viewmodels/gameStart/purchase"},{route:"game",title:"Game",moduleId:"viewmodels/gameStart/game"}]).buildNavigationModel(),e.activate()}var a={router:e,activate:t};return a});
define('text',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});

define('text!views/about.html',[],function () { return '<div class="row">\r\n\t<div class="span1">\r\n\r\n\t</div>\r\n\t<div class="span10">\r\n\t\t<h2>About this port of DND -</h2>\r\n\t\t<h3>© 1977-2014 Richard Garriott</h3>\r\n\t\t<h3>Ported by Kadumel - <a href="https://twitter.com/pwkad">@pwkad</a> (Patrick Walters) <a href="www.sotaexchange.com">SotaX</a></h3>\r\n\t\t<h4>Want to add a free Shroud of the Avatar comments or discussion area to your fan site?  Click the above link and contact us!</h4>\r\n\t</div>\r\n\t<div class="span1">\r\n\r\n\t</div>\r\n</div>\r\n';});


define('text!views/gameStart/character.create.html',[],function () { return '<div class="row" data-bind="visible: state() === 1">\r\n\t<div class="span2">\r\n\r\n\t</div>\r\n\t<div class="span8">\t\t\r\n\t\t<div data-bind="with: character">\r\n\t\t\t<h5>CHARACTER NAME</h5>\r\n\t\t\t<input data-bind="value: name, returnAction: $parent.create, hasFocus: $parent.focusNameInput, valueUpdate: \'afterkeydown\'" />\r\n\t\t</div>\r\n\t</div>\t\r\n\t<div class="span2">\r\n\r\n\t</div>\r\n</div>\r\n<div class="row" data-bind="visible: state() === 2">\r\n\t<div class="span2">\r\n\r\n\t</div>\r\n\t<div class="span8">\r\n\t\t<div class="row">\r\n\t\t\t<h2><a href="https://www.shroudoftheavatar.com/?p=39149">WHY DOES THIS GAME LOOK OLD?</a></h2>\r\n\t\t</div>\r\n\t\t<div data-bind="with: character">\r\n\t\t\t<h5>CLASSIFICATION</h5>\r\n\t\t\t<h5>WHICH DO YOU WANT TO BE</h5>\r\n\t\t\t<h5 data-bind="text: $parent.classTypesString"></h5>\r\n\t\t\t<input data-bind="value: $parent.className, returnAction: $parent.addClass, hasFocus: $parent.focusClassInput, valueUpdate: \'afterkeydown\'" />\r\n\t\t</div>\r\n\t</div>\r\n\t<div class="span2">\r\n\r\n\t</div>\r\n</div>';});


define('text!views/gameStart/designer.html',[],function () { return '<div class="row">\r\n\t<div class="span1">\r\n\r\n\t</div>\r\n\t<div class="span8">\r\n\t\t<div class="row">\r\n\t\t\t<h5>LEVEL DESIGNER</h5>\r\n\t\t\t<div class="span12">\r\n\t\t\t\t<label>MAP ID: </label><input data-bind="value: idValue, css: { \'invalid\': idIsInvalid }" />\r\n\t\t\t\t<label>MAP NAME: </label><input data-bind="value: nameValue, css: { \'invalid\': nameIsInvalid }" />\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t\t<div class="row">\r\n\t\t\t<textarea class="span12" data-bind="value: mapString"></textarea>\r\n\t\t</div>\r\n\t\t<div class="row">\r\n\t\t\t<!-- ko if: isNew -->\r\n\t\t\t<button data-bind="click: create, enable: canSave">Create</button>\r\n\t\t\t<!-- /ko -->\r\n\t\t\t<!-- ko ifnot: isNew -->\r\n\t\t\t<button data-bind="click: save, enable: canSave">Save</button>\r\n\t\t\t<!-- /ko -->\r\n\t\t</div>\r\n\t</div>\t\r\n\t<div class="span3">\r\n\t\t<h3>AVAILABLE TILES:</h3>\r\n\t\t<small>NAME : DESIGNER CHAR : OUTPUT</small>\r\n\t\t<ul data-bind="foreach: tileTypes">\r\n\t\t\t<li>\r\n\t\t\t\t<strong><span data-bind="text: name"></span> : <span data-bind="text: designerImage"></span> : <span data-bind="text: image"></span></strong>\r\n\t\t\t</li>\r\n\t\t</ul>\t\t\r\n\t\t<div class="row">\r\n\t\t\t<div class="span1"> </div>\r\n\t\t\t<div class="span11">\r\n\t\t\t\t<h3>EXAMPLE :</h3>\r\n\t\t\t\t<textarea class="example" data-bind="value: exampleString" rows="7" cols="7" readonly="readonly"></textarea>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\r\n</div>';});


define('text!views/gameStart/game.html',[],function () { return '<div class="row">\r\n\t<div class="span2">\r\n\r\n\t</div>\r\n\t<div class="span8">\r\n\t\t<div class="row">\r\n\t\t\t<h3 data-bind="text: gameMessage"></h3>\r\n\t\t</div>\r\n\t\t<div class="row">\r\n\t\t\t<input data-bind="value: gameInput, returnAction: enterCommand, hasFocus: focusGameInput, valueUpdate: \'afterkeydown\'" />\r\n\t\t</div>\r\n\t</div>\t\r\n\t<div class="span2">\r\n\r\n\t</div>\r\n</div>\r\n<div class="row gameboard" data-bind="with: centeredMap">\r\n\t<div class="span1">\r\n\r\n\t</div>\r\n\t<div class="span2" data-bind="with: $parent.player">\r\n\t\t<h3>ATTRIBUTES</h3>\r\n\t\t<ul>\r\n\t\t\t<li>\r\n\t\t\t\t<span>NAME: </span><span data-bind="text: name"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>HIT POINTS: </span><span data-bind="text: hitPoints"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>GOLD: </span><span data-bind="text: gold"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>STRENGTH: </span><span data-bind="text: strength"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>DEXTERITY: </span><span data-bind="text: dexterity"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>CONSTITUTION: </span><span data-bind="text: constitution"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>WISDOM: </span><span data-bind="text: wisdom"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>INTELLECT: </span><span data-bind="text: intellect"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<!-- ko if: weapon() -->\r\n\t\t\t\t<span>WIELDING: </span><span data-bind="text: weapon().name"></span>\r\n\t\t\t\t<!-- /ko -->\r\n\t\t\t\t<!-- ko ifnot: weapon() -->\r\n\t\t\t\t<span>WIELDING: </span><span>NOTHING</span>\r\n\t\t\t\t<!-- /ko -->\r\n\t\t\t</li>\r\n\t\t</ul>\r\n\t\t<h3>WEAPONS</h3>\r\n\t\t<ul data-bind="foreach: weapons">\r\n\t\t\t<li>\r\n\t\t\t\t<strong><span>NAME: </span><span data-bind="text: name"></span> - VALUE: <span data-bind="text: value"></span></strong>\r\n\t\t\t</li>\r\n\t\t</ul>\r\n\t\t<h3>ITEMS</h3>\r\n\t\t<ul data-bind="foreach: items">\r\n\t\t\t<li>\r\n\t\t\t\t<strong><span data-bind="text: $index"></span> - <span>NAME: </span><span data-bind="text: name"></span> - VALUE: <span data-bind="text: value"></span></strong>\r\n\t\t\t</li>\r\n\t\t</ul>\r\n\t</div>\r\n\t<div class="span7">\r\n\t\t<ul class="unstyled " data-bind="foreach: rows">\r\n\t\t\t<li>\r\n\t\t\t\t<ul class="unstyled game-row" data-bind="foreach: $data">\r\n\t\t\t\t\t<li class="game-tile">\r\n\t\t\t\t\t\t<span data-bind="text: image"></span>\r\n\t\t\t\t\t</li>\r\n\t\t\t\t</ul>\r\n\t\t\t</li>\r\n\t\t</ul>\r\n\t</div>\r\n\t<div class="span2">\r\n\t\t<h3>INSTRUCTIONS</h3>\r\n\t\t<ul data-bind="foreach: $parent.instructions">\r\n\t\t\t<li>\r\n\t\t\t\t<span data-bind="text: $data"></span>\r\n\t\t\t</li>\r\n\t\t</ul>\r\n\t</div>\r\n</div>';});


define('text!views/gameStart/purchase.html',[],function () { return '<div class="row">\r\n\t<div class="span1">\r\n\r\n\t</div>\r\n\t<div class="span2" data-bind="with: player">\r\n\t\t<h3>ATTRIBUTES</h3>\r\n\t\t<ul>\r\n\t\t\t<li>\r\n\t\t\t\t<span>NAME: </span><span data-bind="text: name"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>HIT POINTS: </span><span data-bind="text: hitPoints"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>GOLD: </span><span data-bind="text: gold"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>STRENGTH: </span><span data-bind="text: strength"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>DEXTERITY: </span><span data-bind="text: dexterity"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>CONSTITUTION: </span><span data-bind="text: constitution"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>WISDOM: </span><span data-bind="text: wisdom"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<span>INTELLECT: </span><span data-bind="text: intellect"></span>\r\n\t\t\t</li>\r\n\t\t\t<li>\r\n\t\t\t\t<!-- ko if: weapon() -->\r\n\t\t\t\t<span>WIELDING: </span><span data-bind="text: weapon().name"></span>\r\n\t\t\t\t<!-- /ko -->\r\n\t\t\t\t<!-- ko ifnot: weapon() -->\r\n\t\t\t\t<span>WIELDING: </span><span>NOTHING</span>\r\n\t\t\t\t<!-- /ko -->\r\n\t\t\t</li>\r\n\t\t</ul>\r\n\t\t<h3>WEAPONS</h3>\r\n\t\t<ul data-bind="foreach: weapons">\r\n\t\t\t<li>\r\n\t\t\t\t<strong><span>NAME: </span><span data-bind="text: name"></span> - VALUE: <span data-bind="text: value"></span></strong>\r\n\t\t\t</li>\r\n\t\t</ul>\r\n\t\t<h3>ITEMS</h3>\r\n\t\t<ul data-bind="foreach: items">\r\n\t\t\t<li>\r\n\t\t\t\t<strong><span data-bind="text: $index() + 1"></span> - <span>NAME: </span><span data-bind="text: name"></span> - VALUE: <span data-bind="text: value"></span></strong>\r\n\t\t\t</li>\r\n\t\t</ul>\r\n\t</div>\r\n\t<div class="span8">\t\t\r\n\t\t<div data-bind="visible: (state() === 1 || state() === 2 )">\r\n\t\t\t<h5>BUYING WEAPONS</h5>\r\n\t\t\t<div class="" data-bind="visible: state() === 1">\r\n\t\t\t\t<h5>FAST OR NORM</h5>\r\n\t\t\t\t<input data-bind="value: fastOrNorm, returnAction: chooseFastOrNorm, hasFocus: state() === 1, valueUpdate: \'afterkeydown\'" />\r\n\t\t\t</div>\r\n\t\t\t<div class="" data-bind="visible: state() === 2">\r\n\t\t\t\t<h5>NUMBER, ITEM, PRICE</h5>\r\n\t\t\t\t<h5>DONE WHEN FINISHED</h5>\r\n\t\t\t\t<ul data-bind="foreach: weaponTypes">\r\n\t\t\t\t\t<li data-bind="text: (id() + \', \' + name() + \', \' + value())"></li>\r\n\t\t\t\t</ul>\r\n\t\t\t\t<input data-bind="value: weaponName, returnAction: addWeapon, hasFocus: state() === 2, valueUpdate: \'afterkeydown\'" />\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t\t<div data-bind="visible: state() === 3">\r\n\t\t\t<h5>BUYING ITEMS</h5>\r\n\t\t\t<div class="">\r\n\t\t\t\t<h5>NUMBER, ITEM, PRICE</h5>\r\n\t\t\t\t<h5>DONE WHEN FINISHED</h5>\r\n\t\t\t\t<ul data-bind="foreach: items">\r\n\t\t\t\t\t<li data-bind="text: (id() + \', \' + name() + \', \' + value())"></li>\r\n\t\t\t\t</ul>\r\n\t\t\t\t<input data-bind="value: itemName, returnAction: addItem, hasFocus: state() === 3, valueUpdate: \'afterkeydown\'" />\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</div>\t\r\n\t<div class="span1">\r\n\r\n\t</div>\r\n</div>';});


define('text!views/home.html',[],function () { return '<div>\r\n\t<h1>Home view</h1>\r\n</div>';});


define('text!views/shell.html',[],function () { return '<div>\r\n    <div class="navbar navbar-fixed-top">\r\n        <div class="navbar-inner">\r\n            <a class="brand" data-bind="attr: { href: router.navigationModel()[0].hash }">\r\n                <i class="icon-home"></i>\r\n                <span>D&D SotA - © 1977-2014 Richard Garriott - Ported by Kadumel - @pwkad</span>\r\n            </a>\r\n            <ul class="nav" data-bind="foreach: router.navigationModel">\r\n                <li data-bind="css: { active: isActive }">\r\n                    <a data-bind="attr: { href: hash }, html: title"></a>\r\n                </li>\r\n            </ul>\r\n            <div class="loader pull-right" data-bind="css: { active: router.isNavigating }">\r\n                <i class="icon-spinner icon-2x icon-spin"></i>\r\n            </div>\r\n        </div>\r\n    </div>    \r\n    <div class="container-fluid page-host" data-bind="router: { cacheViews:true }"></div>\r\n</div>';});


define('text!views/start.html',[],function () { return '<section>\r\n    <h1>D&D SotA</h1>\r\n    <p>This is a work in progress fa sho</p>\r\n</section>';});

define('plugins/dialog',["durandal/system","durandal/app","durandal/composition","durandal/activator","durandal/viewEngine","jquery","knockout"],function(e,t,a,n,i,r,o){function s(t){return e.defer(function(a){e.isString(t)?e.acquire(t).then(function(t){a.resolve(e.resolveObject(t))}).fail(function(a){e.error("Failed to load dialog module ("+t+"). Details: "+a.message)}):a.resolve(t)}).promise()}var c,l={},u=0,d=function(e,t,a){this.message=e,this.title=t||d.defaultTitle,this.options=a||d.defaultOptions};return d.prototype.selectOption=function(e){c.close(this,e)},d.prototype.getView=function(){return i.processMarkup(d.defaultViewMarkup)},d.setViewUrl=function(e){delete d.prototype.getView,d.prototype.viewUrl=e},d.defaultTitle=t.title||"Application",d.defaultOptions=["Ok"],d.defaultViewMarkup=['<div data-view="plugins/messageBox" class="messageBox">','<div class="modal-header">','<h3 data-bind="text: title"></h3>',"</div>",'<div class="modal-body">','<p class="message" data-bind="text: message"></p>',"</div>",'<div class="modal-footer" data-bind="foreach: options">','<button class="btn" data-bind="click: function () { $parent.selectOption($data); }, text: $data, css: { \'btn-primary\': $index() == 0, autofocus: $index() == 0 }"></button>',"</div>","</div>"].join("\n"),c={MessageBox:d,currentZIndex:1050,getNextZIndex:function(){return++this.currentZIndex},isOpen:function(){return u>0},getContext:function(e){return l[e||"default"]},addContext:function(e,t){t.name=e,l[e]=t;var a="show"+e.substr(0,1).toUpperCase()+e.substr(1);this[a]=function(t,a){return this.show(t,a,e)}},createCompositionSettings:function(e,t){var a={model:e,activate:!1,transition:!1};return t.attached&&(a.attached=t.attached),t.compositionComplete&&(a.compositionComplete=t.compositionComplete),a},getDialog:function(e){return e?e.__dialog__:void 0},close:function(e){var t=this.getDialog(e);if(t){var a=Array.prototype.slice.call(arguments,1);t.close.apply(t,a)}},show:function(t,i,r){var o=this,c=l[r||"default"];return e.defer(function(e){s(t).then(function(t){var r=n.create();r.activateItem(t,i).then(function(n){if(n){var i=t.__dialog__={owner:t,context:c,activator:r,close:function(){var a=arguments;r.deactivateItem(t,!0).then(function(n){n&&(u--,c.removeHost(i),delete t.__dialog__,0===a.length?e.resolve():1===a.length?e.resolve(a[0]):e.resolve.apply(e,a))})}};i.settings=o.createCompositionSettings(t,c),c.addHost(i),u++,a.compose(i.host,i.settings)}else e.resolve(!1)})})}).promise()},showMessage:function(t,a,n){return e.isString(this.MessageBox)?c.show(this.MessageBox,[t,a||d.defaultTitle,n||d.defaultOptions]):c.show(new this.MessageBox(t,a,n))},install:function(e){t.showDialog=function(e,t,a){return c.show(e,t,a)},t.showMessage=function(e,t,a){return c.showMessage(e,t,a)},e.messageBox&&(c.MessageBox=e.messageBox),e.messageBoxView&&(c.MessageBox.prototype.getView=function(){return e.messageBoxView})}},c.addContext("default",{blockoutOpacity:.2,removeDelay:200,addHost:function(e){var t=r("body"),a=r('<div class="modalBlockout"></div>').css({"z-index":c.getNextZIndex(),opacity:this.blockoutOpacity}).appendTo(t),n=r('<div class="modalHost"></div>').css({"z-index":c.getNextZIndex()}).appendTo(t);if(e.host=n.get(0),e.blockout=a.get(0),!c.isOpen()){e.oldBodyMarginRight=t.css("margin-right"),e.oldInlineMarginRight=t.get(0).style.marginRight;var i=r("html"),o=t.outerWidth(!0),s=i.scrollTop();r("html").css("overflow-y","hidden");var l=r("body").outerWidth(!0);t.css("margin-right",l-o+parseInt(e.oldBodyMarginRight,10)+"px"),i.scrollTop(s)}},removeHost:function(e){if(r(e.host).css("opacity",0),r(e.blockout).css("opacity",0),setTimeout(function(){o.removeNode(e.host),o.removeNode(e.blockout)},this.removeDelay),!c.isOpen()){var t=r("html"),a=t.scrollTop();t.css("overflow-y","").scrollTop(a),e.oldInlineMarginRight?r("body").css("margin-right",e.oldBodyMarginRight):r("body").css("margin-right","")}},attached:function(e){r(e).css("visibility","hidden")},compositionComplete:function(e,t,a){var n=c.getDialog(a.model),i=r(e),o=i.find("img").filter(function(){var e=r(this);return!(this.style.width&&this.style.height||e.attr("width")&&e.attr("height"))});i.data("predefinedWidth",i.get(0).style.width);var s=function(){setTimeout(function(){i.data("predefinedWidth")||i.css({width:""});var e=i.outerWidth(!1),t=i.outerHeight(!1),a=r(window).height(),o=Math.min(t,a);i.css({"margin-top":(-o/2).toString()+"px","margin-left":(-e/2).toString()+"px"}),i.data("predefinedWidth")||i.outerWidth(e),t>a?i.css("overflow-y","auto"):i.css("overflow-y",""),r(n.host).css("opacity",1),i.css("visibility","visible"),i.find(".autofocus").first().focus()},1)};s(),o.load(s),i.hasClass("autoclose")&&r(n.blockout).click(function(){n.close()})}}),c});
define('plugins/http',["jquery","knockout"],function(e,t){return{callbackParam:"callback",get:function(t,a){return e.ajax(t,{data:a})},jsonp:function(t,a,n){return-1==t.indexOf("=?")&&(n=n||this.callbackParam,t+=-1==t.indexOf("?")?"?":"&",t+=n+"=?"),e.ajax({url:t,dataType:"jsonp",data:a})},post:function(a,n){return e.ajax({url:a,data:t.toJSON(n),type:"POST",contentType:"application/json",dataType:"json"})}}});
define('plugins/observable',["durandal/system","durandal/binder","knockout"],function(e,t,a){function n(e){var t=e[0];return"_"===t||"$"===t}function i(t){return!(!t||void 0===t.nodeType||!e.isNumber(t.nodeType))}function r(e){if(!e||i(e)||e.ko===a||e.jquery)return!1;var t=p.call(e);return-1==f.indexOf(t)&&!(e===!0||e===!1)}function o(e,t){var a=e.__observable__,n=!0;if(!a||!a.__full__){a=a||(e.__observable__={}),a.__full__=!0,m.forEach(function(a){e[a]=function(){n=!1;var e=h[a].apply(t,arguments);return n=!0,e}}),v.forEach(function(a){e[a]=function(){n&&t.valueWillMutate();var i=g[a].apply(e,arguments);return n&&t.valueHasMutated(),i}}),y.forEach(function(a){e[a]=function(){for(var i=0,r=arguments.length;r>i;i++)s(arguments[i]);n&&t.valueWillMutate();var o=g[a].apply(e,arguments);return n&&t.valueHasMutated(),o}}),e.splice=function(){for(var a=2,i=arguments.length;i>a;a++)s(arguments[a]);n&&t.valueWillMutate();var r=g.splice.apply(e,arguments);return n&&t.valueHasMutated(),r};for(var i=0,r=e.length;r>i;i++)s(e[i])}}function s(t){var i,s;if(r(t)&&(i=t.__observable__,!i||!i.__full__)){if(i=i||(t.__observable__={}),i.__full__=!0,e.isArray(t)){var c=a.observableArray(t);o(t,c)}else for(var u in t)n(u)||i[u]||(s=t[u],e.isFunction(s)||l(t,u,s));T&&e.log("Converted",t)}}function c(e,t,a){var n;e(t),n=e.peek(),a?n?n.destroyAll||o(n,e):(n=[],e(n),o(n,e)):s(n)}function l(t,n,i){var r,l,u=t.__observable__||(t.__observable__={});if(void 0===i&&(i=t[n]),e.isArray(i))r=a.observableArray(i),o(i,r),l=!0;else if("function"==typeof i){if(!a.isObservable(i))return null;r=i}else e.isPromise(i)?(r=a.observable(),i.then(function(t){if(e.isArray(t)){var n=a.observableArray(t);o(t,n),t=n}r(t)})):(r=a.observable(i),s(i));return Object.defineProperty(t,n,{configurable:!0,enumerable:!0,get:r,set:a.isWriteableObservable(r)?function(t){t&&e.isPromise(t)?t.then(function(t){c(r,t,e.isArray(t))}):c(r,t,l)}:void 0}),u[n]=r,r}function u(t,n,i){var r,o={owner:t,deferEvaluation:!0};return"function"==typeof i?o.read=i:("value"in i&&e.error('For defineProperty, you must not specify a "value" for the property. You must provide a "get" function.'),"function"!=typeof i.get&&e.error('For defineProperty, the third parameter must be either an evaluator function, or an options object containing a function called "get".'),o.read=i.get,o.write=i.set),r=a.computed(o),t[n]=r,l(t,n,r)}var d,p=Object.prototype.toString,f=["[object Function]","[object String]","[object Boolean]","[object Number]","[object Date]","[object RegExp]"],m=["remove","removeAll","destroy","destroyAll","replace"],v=["pop","reverse","sort","shift","splice"],y=["push","unshift"],g=Array.prototype,h=a.observableArray.fn,T=!1;return d=function(e,t){var n,i,r;return e?(n=e.__observable__,n&&(i=n[t])?i:(r=e[t],a.isObservable(r)?r:l(e,t,r))):null},d.defineProperty=u,d.convertProperty=l,d.convertObject=s,d.install=function(e){var a=t.binding;t.binding=function(e,t,n){n.applyBindings&&!n.skipConversion&&s(e),a(e,t)},T=e.logConversion},d});
define('plugins/serializer',["durandal/system"],function(e){return{typeAttribute:"type",space:void 0,replacer:function(e,t){if(e){var n=e[0];if("_"===n||"$"===n)return void 0}return t},serialize:function(t,n){return n=void 0===n?{}:n,(e.isString(n)||e.isNumber(n))&&(n={space:n}),JSON.stringify(t,n.replacer||this.replacer,n.space||this.space)},getTypeId:function(e){return e?e[this.typeAttribute]:void 0},typeMap:{},registerType:function(){var t=arguments[0];if(1==arguments.length){var n=t[this.typeAttribute]||e.getModuleId(t);this.typeMap[n]=t}else this.typeMap[t]=arguments[1]},reviver:function(e,t,n,a){var i=n(t);if(i){var r=a(i);if(r)return r.fromJSON?r.fromJSON(t):new r(t)}return t},deserialize:function(e,t){var n=this;t=t||{};var a=t.getTypeId||function(e){return n.getTypeId(e)},i=t.getConstructor||function(e){return n.typeMap[e]},r=t.reviver||function(e,t){return n.reviver(e,t,a,i)};return JSON.parse(e,r)}}});
define('plugins/widget',["durandal/system","durandal/composition","jquery","knockout"],function(e,t,n,a){function i(e,n){var i=a.utils.domData.get(e,u);i||(i={parts:t.cloneNodes(a.virtualElements.childNodes(e))},a.virtualElements.emptyNode(e),a.utils.domData.set(e,u,i)),n.parts=i.parts}var r={},o={},s=["model","view","kind"],u="durandal-widget-data",c={getSettings:function(t){var n=a.utils.unwrapObservable(t())||{};if(e.isString(n))return{kind:n};for(var i in n)n[i]=-1!=a.utils.arrayIndexOf(s,i)?a.utils.unwrapObservable(n[i]):n[i];return n},registerKind:function(e){a.bindingHandlers[e]={init:function(){return{controlsDescendantBindings:!0}},update:function(t,n,a,r,o){var s=c.getSettings(n);s.kind=e,i(t,s),c.create(t,s,o,!0)}},a.virtualElements.allowedBindings[e]=!0,t.composeBindings.push(e+":")},mapKind:function(e,t,n){t&&(o[e]=t),n&&(r[e]=n)},mapKindToModuleId:function(e){return r[e]||c.convertKindToModulePath(e)},convertKindToModulePath:function(e){return"widgets/"+e+"/viewmodel"},mapKindToViewId:function(e){return o[e]||c.convertKindToViewPath(e)},convertKindToViewPath:function(e){return"widgets/"+e+"/view"},createCompositionSettings:function(e,t){return t.model||(t.model=this.mapKindToModuleId(t.kind)),t.view||(t.view=this.mapKindToViewId(t.kind)),t.preserveContext=!0,t.activate=!0,t.activationData=t,t.mode="templated",t},create:function(e,n,a,i){i||(n=c.getSettings(function(){return n},e));var r=c.createCompositionSettings(e,n);t.compose(e,r,a)},install:function(e){if(e.bindingName=e.bindingName||"widget",e.kinds)for(var n=e.kinds,r=0;r<n.length;r++)c.registerKind(n[r]);a.bindingHandlers[e.bindingName]={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,a,r){var o=c.getSettings(t);i(e,o),c.create(e,o,r,!0)}},t.composeBindings.push(e.bindingName+":"),a.virtualElements.allowedBindings[e.bindingName]=!0}};return c});
define('transitions/entrance',["durandal/system","durandal/composition","jquery"],function(e,t,n){var a=100,i={marginRight:0,marginLeft:0,opacity:1},r={marginLeft:"",marginRight:"",opacity:"",display:""},o=function(t){return e.defer(function(e){function o(){e.resolve()}function s(){t.keepScrollPosition||n(document).scrollTop(0)}function u(){s(),t.triggerAttach();var e={marginLeft:l?"0":"20px",marginRight:l?"0":"-20px",opacity:0,display:"block"},a=n(t.child);a.css(e),a.animate(i,{duration:c,easing:"swing",always:function(){a.css(r),o()}})}if(t.child){var c=t.duration||500,l=!!t.fadeOnly;t.activeView?n(t.activeView).fadeOut({duration:a,always:u}):u()}else n(t.activeView).fadeOut(a,o)}).promise()};return o});

require(["main"]);
}());