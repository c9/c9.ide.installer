define(function(require, exports, module) {
    main.consumes = ["Plugin", "installer", "proc", "c9"];
    main.provides = ["installer.symlink"];
    return main;

    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var installer = imports.installer;
        var proc = imports.proc;
        var c9 = imports.c9;
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        
        /**
         * Creates a symlink
         */
        function execute(task, options, onData, callback) {
            if (!task.source || !task.target) {
                throw new Error("Invalid Task Definition. Missing source "
                    + "and/or target field: " + JSON.stringify(task));
            }
            
            var source = task.source.replace(/^~/, c9.home);
            var target = task.target.replace(/^~/, c9.home);
            
            proc.execFile("ln", {
                args: ["-f", "-s", source, target],
                cwd: options.cwd || null
            }, function(err, stdout, stderr){
                // Pipe the data to the onData function
                if (stdout) onData(stdout);
                if (stderr) onData(stderr);
                
                if (err) return callback(err);
                else callback();
            });
        }
        
        function isAvailable(callback){
            callback(true);
        }
        
        plugin.on("load", function() {
            installer.addPackageManager("symlink", plugin);
        });
        plugin.on("unload", function() {
            installer.removePackageManager("symlink");
        });
        
        plugin.freezePublicAPI({ execute: execute, isAvailable: isAvailable });
        
        register(null, {
            "installer.symlink": plugin
        });
    }
});