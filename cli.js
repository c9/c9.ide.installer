define(function(require, exports, module) {
    main.consumes = [
        "Plugin", "installer"
    ];
    main.provides = ["installer.cli"];
    return main;

    /*
        - Always assume one session
        - Start immediately
    */

    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var installer = imports.installer;
        
        var RED = "\x1b[01;31m";
        var GREEN = "\x1b[01;32m";
        var YELLOW = "\x1b[01;33m";
        var BLUE = "\x1b[01;34m";
        var MAGENTA = "\x1b[01;35m";
        var LIGHTBlUE = "\x1b[01;94m";
        var RESETCOLOR = "\x1b[0m";
        var BOLD = "\x1b[01;1m";
        var UNBOLD = "\x1b[01;21m";
        
        var currentSession;
        
        /***** Initialization *****/
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        // var emit = plugin.getEmitter();
        
        function load() {
            process.stdin.on("data", function(data){
                var session = currentSession;
                if (session && session.executing) {
                    if (session.process)
                        session.process.write(data);
                    return true;
                }
            });
            
            // Hook the creation of new sessions
            installer.on("beforeStart", function(e){
                start(e.session);
            }, plugin);
        }
        
        /***** Methods *****/
        
        function start(session, callback) {
            currentSession = session;
            
            // Start Installation
            logln("Installation Started", LIGHTBlUE);
            logln("");
            
            session.on("run", function(){
                var heading = "Package " + session.package.name 
                    + " " + session.package.version;
                logln(heading + "\n" + Array(heading.length + 1).join("-"));
            });
            
            var lastOptions;
            session.on("each", function(e){
                if (lastOptions != e.options) {
                    lastOptions = e.options;
                    if (e.options.name)
                        logln("Installing " + e.options.name, BLUE);
                }
            });
            session.on("data", function(e){
                log(e.data);
            });
            
            session.start(function(err){
                if (err) {
                    logln("\n" + err.message + "\n\n" + RED
                      + "One or more errors occured. "
                      + "Please try to resolve them and "
                      + "restart Cloud9 or contact support@c9.io." 
                      + RESETCOLOR);
                }
                else {
                    logln("");
                    logln("Installation Completed.", LIGHTBlUE);
                }
            }, true);
        }
        
        function log(msg) {
            process.stdout.write(msg);
        }
        
        function logln(msg, color, unset) {
            process.stdout.write((color || "") + msg + (color ? unset || RESETCOLOR : "") + "\n");
        }
        
        /***** Lifecycle *****/
        
        plugin.on("load", function() {
            load();
        });
        plugin.on("unload", function() {
            currentSession = null;
        });
        
        /***** Register and define API *****/
        
        plugin.freezePublicAPI({
        });
        
        register(null, {
            "installer.cli": plugin
        });
    }
});