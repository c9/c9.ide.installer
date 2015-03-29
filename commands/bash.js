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
            
            var args = ["-c", script.code].concat(script.args || []);
            
            proc.spawn("bash", {
                args: args,
                cwd: options.cwd || null
            }, function(err, process){
                if (err) return callback(err);
                
                // Pipe the data to the onData function
                process.stdout.on("data", function(chunk){
                    onData(chunk, "stdout", process);
                });
                process.stderr.on("data", function(chunk){
                    onData(chunk, "stderr", process);
                });
                
                // When process exits call callback
                process.on("exit", function(code){
                    if (!code) callback();
                    else callback(new Error("Failed. Exit code " + code));
                });
            });
            
        }
        
        plugin.on("load", function() {
            installer.addPackageManager("bash", plugin);
        });
        plugin.on("unload", function() {
            installer.removePackageManager("bash");
        });
        
        plugin.freezePublicAPI({ execute: execute });
        
        register(null, {
            "installer.bash": plugin
        });
    }
});