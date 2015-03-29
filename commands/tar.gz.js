define(function(require, exports, module) {
    main.consumes = ["Plugin", "installer", "proc"];
    main.provides = ["installer.tar.gz"];
    return main;

    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var installer = imports.installer;
        var proc = imports.proc;
        
        var binBash = options.binBash || "bash";
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        
        /**
         * Extracts a tar.gz package to a target directory
         * Optionally downloads a tar.gz package from a url
         */
        function execute(task, options, onData, callback) {
            if (!task.source && !task.url) {
                throw new Error("Invalid Task Definition. Missing source "
                    + "or url field: " + JSON.stringify(task));
            }
            
            proc.spawn(binBash, {
                args: ["-c", require("text!./tar.gz.sh"), task.source, task.target, task.url],
                cwd: options.cwd || null
            }, function(err, process){
                if (err) return callback(err);
                
                // Pipe the data to the onData function
                process.stdout.on("data", function(chunk){
                    onData(chunk, "stdout");
                });
                process.stderr.on("data", function(chunk){
                    onData(chunk, "stderr");
                });
                
                // When process exits call callback
                process.on("exit", function(code){
                    if (!code) callback();
                    else callback(new Error("Failed. Exit code " + code));
                });
            });
            
        }
        
        plugin.on("load", function() {
            installer.addPackageManager("tar.gz", plugin);
        });
        plugin.on("unload", function() {
            installer.removePackageManager("tar.gz");
        });
        
        plugin.freezePublicAPI({ execute: execute });
        
        register(null, {
            "installer.tar.gz": plugin
        });
    }
});