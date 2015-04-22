define(function(require, exports, module) {
    exports.ptyExec = function(options, onData, callback) {
        // Working around PTY.js not having an exit code
        // Until https://github.com/chjj/pty.js/pull/110#issuecomment-93573223 is merged
        // wrap script in a function and use subshell to prevent exit 0 skipping echo ß
        var code = 'fcn() {\n'
            + options.code
            + '\n}'
            + '\n(echo 1 | fcn "$@") && echo ß';
            
        options.proc.pty(options.bash || "bash", {
            args: ["-c", code].concat(options.args || []),
            cwd: options.cwd || null
        }, function(err, pty){
            if (err) return callback(err);
            
            var done = false;
            
            // Pipe the data to the onData function
            pty.on("data", function(chunk){
                if (chunk.indexOf("ß") > -1) {
                    done = true;
                    chunk = chunk.replace("ß", "");
                }
                
                onData(chunk, pty);
            });
            
            // When process exits call callback
            pty.on("exit", function(code){
                if (!done && !code) code = "E_MISSING_END_MARKER";
                
                if (!code) callback();
                else callback(new Error("Failed " + options.name + ". Exit code " + code));
            });
        });
    };
    
});