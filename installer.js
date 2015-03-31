define(function(require, exports, module) {
    main.consumes = ["Plugin", "automate", "vfs", "c9", "proc", "fs"];
    main.provides = ["installer"];
    return main;

    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var automate = imports.automate;
        var c9 = imports.c9;
        var proc = imports.proc;
        var fs = imports.fs;
        
        /***** Initialization *****/
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        var emit = plugin.getEmitter();
        
        var VERSION = c9.version || "3.0.0";
        var NAMESPACE = "installer";
        var installSelfCheck = options.installSelfCheck;
        var installChecked = false;
        
        var sessions = [];
        var installed = {};
        
        function load() {
            imports.vfs.on("beforeConnect", function(e) {
                if (!installSelfCheck || installChecked)
                    return e.done(false);
                
                installChecked = true;
                
                // plugin.allowClose = false;
                // plugin.once("finish", function(){
                //     plugin.hide();
                //     e.callback(true);
                // });
                // plugin.show(true);
                
                readFromDisk(e.done, e.vfs);
                
                return false;
            });
        }
        
        /***** Methods *****/
        
        function readFromDisk(callback, vfs){
            function done(err){
                emit.sticky("ready", installed);
                
                if (err && err.code == "ENOENT" || installed["Cloud9 IDE"] !== VERSION) {
                    // Tmux and pty.js are probably not installed. Lets switch 
                    // to a special mode of proc
                    proc.installMode = vfs;
                    
                    // Wait until installer is done
                    plugin.on("stop", function(){
                        if (sessions.length == 0) {
                            proc.installMode = false;
                            callback(true);
                        }
                    });
                    
                    selfInstall();
                }
                else {
                    callback();
                }
            }
            
            vfs.readfile(options.installPath.replace(c9.home, "~") + "/installed", {
                encoding: "utf8"
            }, function(err, meta) {
                if (err) return done(err);
                
                var data = "";    
                var stream = meta.stream;
                stream.on("data", function(chunk){ data += chunk; });
                stream.on("end", function(){ 
                    if (data == "1\n") // Backwards compatibility
                        data = "Cloud9 IDE@3.0.0\nc9.ide.collab@3.0.0\nc9.ide.find@3.0.0";
                    
                    (data || "").split("\n").forEach(function(line){
                        if (!line) return;
                        var p = line.split("@");
                        installed[p[0]] = p[1];
                    });
                    
                    done();
                });
            });
        }
        
        function selfInstall() {
            // createSession("Cloud9 IDE", VERSION, require("./install.js"));
                
            // createSession("c9.ide.collab", VERSION, function(session, options){
            //     // Installation tasks are stacked (AND) by using an array as the 2nd
            //     // argument to install()
            //     session.install({
            //         "name": "collab-deps",
            //         "description": "Dependencies for the collaboration features of Cloud9",
            //         "cwd": "~/.c9",
            //         "optional": true
            //     }, [
            //         {
            //             "npm": ["sqlite3@2.1.18", "sequelize@2.0.0-beta.0"]
            //         },
            //         {
            //             "tar.gz": [
            //                 {
            //                     "url": "https://raw.githubusercontent.com/c9/install/master/packages/sqlite3/linux/sqlite3.tar.gz",
            //                     "target": "~/.c9/lib/sqlite3"
            //                 },
            //                 { 
            //                     "url": "https://raw.githubusercontent.com/c9/install/master/packages/extend/c9-vfs-extend.tar.gz",
            //                     "target": "~/.c9/c9-vfs-extend"
            //                 }
            //             ]
            //         },
            //         {
            //             "symlink": {
            //                 "source": "~/.c9/lib/sqlite3/sqlite3",
            //                 "target": "~/.c9/bin/sqlite3"
            //             }
            //         }
            //     ]);
                
            //     session.start();
            // });
                
            createSession("c9.ide.find", VERSION, function(session, options){
                // By specifying optional:true the user can disable the installation of this package
                session.install({
                    "name": "Nak",
                    "description": "Fast file searches for Cloud9",
                    "cwd": "~/.c9",
                    "optional": true
                }, {
                    "npm": "https://github.com/c9/nak/tarball/c9"
                });
                
                session.start();
            });
        }
        
        function addPackageManager(name, implementation){
            automate.addCommand(NAMESPACE, name, implementation);
        }
        
        function removePackageManager(name) {
            automate.removeCommand(NAMESPACE, name);
        }

        // Add aliases to support a broader range of platforms
        function addPackageManagerAlias(){
            var args = [NAMESPACE];
            for (var i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
                
            automate.addCommandAlias.apply(this, args);
        }
        
        function createSession(packageName, packageVersion, populateSession, callback) {
            if (!installed) {
                return plugin.on("ready", 
                    createSession.bind(this, packageName, packageVersion, install, callback));
            }
            
            if (installed[packageName] == packageVersion)
                return callback && callback();
            
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
            
            function start(callback, force) {
                if (force || emit("beforeStart", { session: session }) !== false) {
                    // Pre script
                    if (pre) session.tasks.unshift({ "bash": pre });
                    
                    // Post script
                    if (post) session.tasks.push({ "bash": post });
                    
                    // Start installation
                    session.run(callback);
                }
            }
            
            session.on("run", function(){
                emit("start", { session: session }); 
            });
            session.on("stop", function(err){
                sessions.remove(session);
                emit("stop", { session: session, error: err });
                callback && callback(err);
                
                // Update installed file
                if (!err) {
                    installed[packageName] = packageVersion;
                    var contents = Object.keys(installed).map(function(item){
                        return item + "@" + installed[item]
                    }).join("\n");
                    fs.writeFile("~/.c9/installed", contents, function(){});
                }
            });
            session.on("each", function(e){
                emit("each", e); 
            });
            
            var intro, pre, post;
            session.freezePublicAPI({
                /**
                 * 
                 */
                package: {
                    name: packageName,
                    version: packageVersion
                },
                
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
            
            populateSession(session, {
                platform: c9.platform,
                arch: c9.arch
            });
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
            ],
            
            /**
             * 
             */
            createSession: createSession,
            
            /**
             * 
             */
            addPackageManager: addPackageManager,
            
            /**
             * 
             */
            removePackageManager: removePackageManager,
            
            /**
             * 
             */
            addPackageManagerAlias: addPackageManagerAlias,
        });
        
        register(null, {
            installer: plugin
        });
    }
});