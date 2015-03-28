define(function(require, exports, module) {
    main.consumes = ["Plugin", "automate", "vfs"];
    main.provides = ["installer"];
    return main;

    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var automate = imports.automate;
        var vfs;
        
        /***** Initialization *****/
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        var emit = plugin.getEmitter();
        
        var NAMESPACE = "install";
        var installSelfCheck = options.installSelfCheck;
        var installChecked = false;
        
        var sessions = [];
        var installed = {};
        
        function load() {
            imports.vfs.on("beforeConnect", function(e) {
                if (!installSelfCheck || installChecked)
                    return e.done(false);
                
                vfs = e.vfs;
                installChecked = true;
                
                // plugin.allowClose = false;
                // plugin.once("finish", function(){
                //     plugin.hide();
                //     e.callback(true);
                // });
                // plugin.show(true);
                
                vfs.readFile(options.installPath + "/installed", {}, function(err, data) {
                    data.split("\n").forEach(function(line){
                        var p = line.split("@");
                        installed[p[0]] = p[1];
                    });
                    
                    emit.sticky("ready", installed);
                    
                    if (err && err.code == "ENOENT") {
                        selfInstall(function(err){
                            if (err) console.log(err);
                            
                            e.done(true);
                        });
                    }
                    else {
                        e.done();
                    }
                });
                
                return false;
            });
        }
        
        /***** Methods *****/
        
        function selfInstall(callback) {
            createSession("installer", "1.0.0", 
                require("./install.js"), callback);
        }
        
        function createSession(pluginName, pluginVersion, populateSession, callback) {
            if (!installed) {
                return plugin.on("ready", 
                    createSession.bind(this, pluginName, pluginVersion, install, callback));
            }
            
            if (installed[pluginName] == pluginVersion)
                return callback();
            
            var session = automate.createSession(NAMESPACE);
            
            var add = session.task; delete session.task;
            function install(options, task, validate) {
                if (!task || typeof task == "function") {
                    if (typeof task == "function")
                        validate = task;
                    task = options;
                    options = {};
                }
                
                add(task, options, validate);
            }
            
            function start(callback) {
                if (emit("beforeStart", { session: session }) !== false)
                    session.run(callback);
            }
            
            session.on("run", function(){
                emit("start", { session: session }); 
            });
            session.on("stop", function(err){
                emit("stop", { session: session, error: err });
                callback(err);
            });
            session.on("each", function(e){
                emit("each", e); 
            });
            
            var intro, pre, post;
            session.freezePublicAPI({
                /**
                 * 
                 */
                get introduction(){ return intro; },
                set introduction(value){ intro = value; },
                /**
                 * 
                 */
                get preInstallScript(){ return pre; },
                set preInstallScript(value){ pre = value; },
                /**
                 * 
                 */
                get postInstallScript(){ return post; },
                set postInstallScript(value){ post = value; },
                
                /**
                 * 
                 */
                install: install,
                
                /**
                 * 
                 */
                start: start
            });
            
            session.on("unload", function(){
                sessions.remove(session);
            }, plugin);
            
            sessions.push(session);
            
            populateSession(session);
        }
        
        /***** Lifecycle *****/
        
        plugin.on("load", function() {
            load();
        });
        plugin.on("unload", function() {
            installChecked = false;
        });
        
        /***** Register and define API *****/
        
        /**
         * 
         **/
        plugin.freezePublicAPI({
            /**
             * 
             */
            get sessions(){ return sessions; },
            
            /**
             * 
             */
            get installed(){ return installed; },
            
            /**
             * 
             */
            createSession: createSession,
            
            _events: [
                /**
                 * @event beforeStart
                 */
                "beforeStart",
                /**
                 * @event start
                 */
                "start",
                /**
                 * @event stop
                 */
                "stop",
                /**
                 * @event each
                 */
                "each"
            ]
        });
        
        register(null, {
            installer: plugin
        });
    }
});