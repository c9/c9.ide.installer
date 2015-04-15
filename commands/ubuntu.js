define(function(require, exports, module) {
    main.consumes = ["Plugin", "installer", "proc"];
    main.provides = ["installer.ubuntu"];
    return main;
    
    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var installer = imports.installer;
        var proc = imports.proc;
        
        var binBash = options.binBash || "bash";
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        
        /**
         * Installs a .deb package
         */
        function execute(task, options, onData, callback) {
            var script = 'set -e\n'
                + 'sudo apt-get install ' + task
                + "\necho ß";
            
            proc.pty(binBash, {
                args: ["-c", script],
                cwd: options.cwd || null
            }, function(err, pty){
                if (err) return callback(err);
                
                var done = false;
                
                // Pipe the data to the onData function
                pty.on("data", function(chunk){
                    // Working around PTY.js not having an exit code
                    // Until https://github.com/chjj/pty.js/pull/110#issuecomment-93573223 is merged
                    if (chunk.indexOf("ß") > -1) {
                        done = true;
                        chunk = chunk.replace("ß", "");
                    }
                    
                    onData(chunk, pty);
                });
                
                // When process exits call callback
                pty.on("exit", function(code){
                    if (!done && !code) code = 100;
                    
                    if (!code) callback();
                    else callback(new Error("Failed Ubuntu. Exit code " + code));
                });
            });
        }
        
        var available;
        function isAvailable(callback){
            if (typeof available != "undefined")
                return callback(available);
            
            proc.execFile("which", { args: ["apt-get"] }, function(err, stdout){
                if (err) return callback(false);
                
                available = stdout.length > 0;
                callback(available);
            });
        }
        
        plugin.on("load", function() {
            installer.addPackageManager("ubuntu", plugin);
            installer.addPackageManagerAlias("ubuntu", "debian");
        });
        plugin.on("unload", function() {
            installer.removePackageManager("ubuntu");
            available = undefined;
        });
        
        plugin.freezePublicAPI({ execute: execute, isAvailable: isAvailable });
        
        register(null, {
            "installer.ubuntu": plugin
        });
    }
});