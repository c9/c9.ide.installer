define(function(require, exports, module) {
    main.consumes = ["Plugin", "installer", "proc"];
    main.provides = ["installer.npm"];
    return main;
    
    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var installer = imports.installer;
        var proc = imports.proc;
        
        var binBash = options.binBash || "bash";
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        
        /**
         * Installs an NPM package
         */
        function execute(task, options, onData, callback) {
            var NPM = options.cwd == "~/.c9"
                ? '"$C9_DIR/node/bin/npm"'
                : "npm";
            
            // node-gyp uses sytem node or fails with command not found if
            // we don't bump this node up in the path
            var script = 'set -e\n'
                + 'C9_DIR="$HOME/.c9"\n'
                + 'PATH="$C9_DIR/node/bin/:$C9_DIR/node_modules/.bin:$PATH"\n'
                + (options.cwd == "~/.c9" ? 'mkdir -p node_modules' : "") + "\n"
                + NPM + ' install ' + task
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
                    else callback(new Error("Failed NPM. Exit code " + code));
                });
            });
        }
        
        function isAvailable(callback){
            callback(true);
        }
        
        plugin.on("load", function() {
            installer.addPackageManager("npm", plugin);
        });
        plugin.on("unload", function() {
            installer.removePackageManager("npm");
        });
        
        plugin.freezePublicAPI({ execute: execute, isAvailable: isAvailable });
        
        register(null, {
            "installer.npm": plugin
        });
    }
});