define(function(require, exports, module) {
    main.consumes = ["Plugin", "installer"];
    main.provides = ["installer.npm-g"];
    return main;
    
    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var installer = imports.installer;
        
        var bashBin = options.bashBin || "bash";
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        
        function execute(task, options, onData, callback, global) {
            var script = [
                "set -e",
                
                "export C9_DIR=$HOME/.c9",
                "export PATH=$PATH:$C9_DIR/node/bin:$C9_DIR/node_modules/.bin",
                "export NPM=$(which npm)",
                
                "mkdir -p $C9_DIR/empty",
                "cd $C9_DIR/empty",
                
                "$NPM install -g --production " + task,
            ];
            
            installer.ptyExec({
                name: "npm-g",
                bash: bashBin,
                code: script.join("\n"),
                cwd: options.cwd,
            }, onData, callback);
        }
        
        function isAvailable(callback) {
            callback(true);
        }
        
        plugin.on("load", function() { installer.addPackageManager("npm-g", plugin); });
        plugin.on("unload", function() { installer.removePackageManager("npm-g"); });
        
        plugin.freezePublicAPI({ execute: execute, isAvailable: isAvailable });
        
        register(null, { "installer.npm-g": plugin });
    }
});