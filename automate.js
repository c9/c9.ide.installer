define(function(require, exports, module) {
    main.consumes = ["Plugin"];
    main.provides = ["automate"];
    return main;

    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        
        var async = require("async");
        
        /***** Initialization *****/
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        // var emit = plugin.getEmitter();
        
        var namespaces = {};
        
        /***** Methods *****/
        
        function addCommand(ns, name, implementation) {
            if (!namespaces[ns]) namespaces[ns] = { commands: {}, alias: {} };
            
            namespaces[ns].commands[name] = implementation;
        }
        
        function removeCommand(ns, name) {
            if (!namespaces[ns]) namespaces[ns] = { commands: {}, alias: {} };
            
            delete namespaces[ns].commands[name];
        }
        
        function addCommandAlias(ns, name) {
            if (!namespaces[ns]) namespaces[ns] = { commands: {}, alias: {} };
            
            for (var i = 1; i < arguments.length; i++) {
                namespaces[ns].alias[arguments[i]] = name;
            }
        }
        
        function getCommand(ns, name) {
            if (!namespaces[ns]) throw new Error("Unknown namespace: " + ns);
            
            var cmd = namespaces[ns].commands;
            return cmd[name] || cmd[namespaces[ns].alias[name]];
        }
        
        function createSession(ns) {
            var session = new Plugin("Ajax.org", main.consumes);
            var emit = session.getEmitter();
            
            var tasks = [];
            var executing = false;
            
            function task(task, options, validate) {
                if (executing) throw new Error("Adding tasks while executing");
                
                if (typeof options == "function" || options === undefined) {
                    if (!validate) validate = options;
                    options = {};
                }
                
                Object.defineProperty(task, "$options", {
                   enumerable: false,
                   configurable: false,
                   writable: false,
                   value: options
                });
                
                tasks.push(task);
            }
            
            function execute(tasks, callback, options) {
                if (!options)
                    options = tasks.$options;
                
                // Loop over all tasks or sub-tasks when called recursively
                async.eachSeries(tasks, function(task, next) {
                    if (!options)
                        options = task.$options || {};
                    
                    if (options.ignore) 
                        return next();
                    
                    // The task consists of multiple tasks
                    if (Array.isArray(task))
                        return execute(task, next, options);
                    
                    // Loop over all competing tasks
                    var found = false;
                    async.eachSeries(Object.keys(task), function(type, next) {
                        var command = getCommand(ns, type);
                        command.isAvailable(function(available){
                            if (!available) return next();
                            
                            var items = Array.isArray(task[type]) 
                                ? task[type] : [task[type]];
                            
                            // Loop over each of the tasks for this command
                            async.eachSeries(items, function(item, next){
                                emit("each", {
                                    session: session,
                                    task: task, 
                                    options: options, 
                                    type: type, 
                                    item: item
                                });
                                
                                command.execute(item, options, function(chunk, process){
                                    emit("data", { data: chunk, process: process });
                                }, function(err){
                                    if (!err) found = true;
                                    
                                    next(err);
                                });
                            }, function(err){
                                next(err);
                            });
                        });
                    }, function(err){
                        if (err) return next(err);
                        if (!found) {
                            err = new Error("None of the available commands are available: " 
                                + JSON.stringify(task, 4, "   "));
                            err.code = "ENOTAVAILABLE";
                            return next(err);
                        }
                        next();
                    });
                    
                }, function(err){
                    callback(err);
                });
            }
            
            function run(callback) {
                emit("run");
                
                executing = true;
                execute(tasks, function(){
                    executing = false;
                    callback.apply(this, arguments);
                    session.unload();
                    
                    emit("stop");
                });
            }
            
            function abort(callback){
                
            }
            
            // Make session a baseclass to allow others to extend
            session.baseclass();
            
            /**
             * 
             **/
            session.freezePublicAPI({
                /**
                 * 
                 */
                get tasks(){ return tasks; },
                
                /**
                 * 
                 */
                get executing(){ return executing; },
                
                /**
                 * 
                 */
                task: task,
                
                /**
                 * 
                 */
                run: run,
                
                /**
                 * 
                 */
                abort: abort
            });
            
            return session;
        }
        
        /***** Lifecycle *****/
        
        plugin.on("load", function() {
            
        });
        plugin.on("unload", function() {
            
        });
        
        /***** Register and define API *****/
        
        /**
         * 
         **/
        plugin.freezePublicAPI({
            /**
             * 
             */
            createSession: createSession,
            
            /**
             * 
             */
            addCommand: addCommand,
            
            /**
             * 
             */
            removeCommand: removeCommand,
            
            /**
             * 
             */
            addCommandAlias: addCommandAlias
        });
        
        register(null, {
            automate: plugin
        });
    }
});