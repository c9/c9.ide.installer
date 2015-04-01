define(function(require, exports, module) {
    
module.exports = function(session, options){
    session.introduction = require("text!./intro.html");
    session.preInstallScript = require("text!./check-deps.sh");

    var NODEVERSION = "v0.10.28";
    
    // Node.js
    session.install({
        "name": "Node.js", 
        "description": "Node.js " + NODEVERSION
    }, [
        {
            "tar.gz": { 
                "url": "http://nodejs.org/dist/" + NODEVERSION + "/node-" 
                    + NODEVERSION + "-" + options.platform + "-" 
                    + options.arch + ".tar.gz",
                "target": "~/.c9/node"
            }
        },
        {
            "bash": require("text!./node.sh")
        }
    ]);

    // Pty.js
    session.install({
        "name": "Pty.js",
        "description": "Pseudo Terminal support. Used by the Cloud9 Terminal",
        "cwd": "~/.c9"
    }, {
        "npm": ["node-gyp", "pty.js@0.2.3"]
    }, function(done){
        session.exec(
            '"~/.c9/node/bin/node" -e "console.log(require(\'pty.js\'))"',
            function(err, stdout, stderr){
                if (!stdout || stdout.indexOf("createTerminal") == -1)
                    err = new Error("Unknown exception installing pty.js: " + stdout);
                done(err);
            });
    });
    
    // Tmux
    session.install({
        "name": "tmux", 
        "description": "Tmux - the terminal multiplexer" 
    }, {
        "ubuntu": "tmux",
        "centos": "tmux",
        "bash": require("text!./tmux.sh")
    });

    // Show the installation screen
    session.start();
};


});