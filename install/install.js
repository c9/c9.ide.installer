define(function(require, exports, module) {
    
module.exports = function(session, options){
    session.introduction = require("text!./intro.html");
    session.preInstallScript = require("text!./check-deps.sh");
    
    // Node.js
    var NODEVERSION = "v0.12.0";
    var nodeName = "node-" + NODEVERSION + "-" 
        + options.platform + "-" + options.arch;
    
    session.install({
        "name": "Node.js", 
        "description": "Node.js " + NODEVERSION,
        optional: true
    }, [
        {
            "tar.gz": { 
                "url": "http://nodejs.org/dist/" + NODEVERSION + "/" + nodeName + ".tar.gz",
                "target": "~/.c9/node",
                "dir": nodeName
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
        "npm": ["node-gyp", "pty.js@0.2.7-1"]
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
        "description": "Tmux - the terminal multiplexer",
        "cwd": "~/.c9"
    }, {
        // // TODO this causes `sudo: no tty present and no askpass program specified` errors
        // // and it somehow breaks "bash" install method too, also this needs to ensure
        // // apt-get installs the correct version instead of compiling 1.9 after installing 1.6
        // "install": [
        //     {
        //         "ubuntu": "tmux",
        //         "centos": "tmux"
        //     },
        //     {
        //         "bash": require("text!./tmux.sh")
        //     }
        // ],
        "bash": require("text!./tmux.sh")
    });

    // Show the installation screen
    session.start();
};


});