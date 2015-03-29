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
                + 'sudo apt-get install ' + task;
            
            proc.spawn(binBash, {
                args: ["-c", script],
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
            installer.addPackageManager("ubuntu", plugin);
            installer.addPackageManagerAlias("ubuntu", "debian");
        });
        plugin.on("unload", function() {
            installer.removePackageManager("ubuntu");
        });
        
        plugin.freezePublicAPI({ execute: execute });
        
        register(null, {
            "installer.ubuntu": plugin
        });
    }
});