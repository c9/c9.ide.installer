define(function(require, exports, module) {
    main.consumes = ["Plugin", "installer", "proc"];
    main.provides = ["installer.bash"];
    return main;

    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var installer = imports.installer;
        var proc = imports.proc;
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        
        /**
         * Execute a bash bash script
         */
        function execute(script, options, onData, callback) {
            if (typeof script == "string") {
                script = {
                    code: script
                }
            }
            // TODO can we add this to script.code?
            // var setPath = 'C9_DIR="$HOME/.c9"\n'
            //     + 'PATH="$C9_DIR/node/bin/:$C9_DIR/node_modules/.bin:$PATH"\n';
            var args = ["-c", script.code + "\necho ?"].concat(script.args || []);
            
            proc.pty("bash", {
                args: args,
                cwd: options.cwd || "~/.c9"
            }, function(err, pty){
                if (err) return callback(err);
                
                var done = false;
                
                // Pipe the data to the onData function
                pty.on("data", function(chunk){
                    // Working around PTY.js not having an exit code
                    // Until https://github.com/chjj/pty.js/pull/110#issuecomment-93573223 is merged
                    if (chunk.indexOf("?") > -1) {
                        done = true;
                        chunk = chunk.replace("?", "");
                    }
                    
                    onData(chunk, pty);
                });
                
                // When process exits call callback
                pty.on("exit", function(code){
                    if (!done && !code) code = 100;
                    
                    if (!code) callback();
                    else callback(new Error("Failed Bash. Exit code " + code));
                });
            });
        }
        
        function isAvailable(callback){
            callback(true);
        }
        
        plugin.on("load", function() {
            installer.addPackageManager("bash", plugin);
        });
        plugin.on("unload", function() {
            installer.removePackageManager("bash");
        });
        
        plugin.freezePublicAPI({ execute: execute, isAvailable: isAvailable });
        
        register(null, {
            "installer.bash": plugin
        });
    }
});