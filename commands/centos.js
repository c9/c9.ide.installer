define(function(require, exports, module) {
    main.consumes = ["Plugin", "installer", "proc"];
    main.provides = ["installer.centos"];
    return main;
    
    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var installer = imports.installer;
        var proc = imports.proc;
        
        var binBash = options.binBash || "bash";
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        
        /**
         * Installs a yum package
         */
        function execute(task, options, onData, callback) {
            var script = 'set -e\n'
                + 'sudo yum install ' + task;
            
            proc.pty(binBash, {
                args: ["-c", script],
                cwd: options.cwd || null
            }, function(err, pty){
                if (err) return callback(err);
                
                // Pipe the data to the onData function
                pty.on("data", function(chunk){
                    onData(chunk, pty);
                });
                
                // When process exits call callback
                pty.on("exit", function(code){
                    if (!code) callback();
                    else callback(new Error("Failed. Exit code " + code));
                });
            });
        }
        
        var available;
        function isAvailable(callback){
            if (typeof available != "undefined")
                return callback(available);
            
            proc.execFile("which", { args: ["yum"] }, function(err, stdout){
                if (err) return callback(false);
                
                available = stdout.length > 0;
                callback(available);
            });
        }
        
        plugin.on("load", function() {
            installer.addPackageManager("centos", plugin);
            installer.addPackageManagerAlias("centos", "rhel", "fedora");
        });
        plugin.on("unload", function() {
            installer.removePackageManager("centos");
            available = undefined;
        });
        
        plugin.freezePublicAPI({ execute: execute, isAvailable: isAvailable });
        
        register(null, {
            "installer.centos": plugin
        });
    }
});