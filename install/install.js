define(function(require, exports, module) {
    
module.exports = function(session, options){
    session.introduction = require("text!./intro.html");
    session.preInstallScript = require("text!./check-deps.sh");
    
    // Node.js
    var NODEVERSION = "v0.12.0";
    var nodeName = "node-" + NODEVERSION + "-" 
        + options.platform + "-" + options.arch;
    
    if (options.platform == "win32") {
        session.preInstallScript = null;
        session.install({
            "name": ".c9",
            "cwd": "~"
        }, {
            "bash": "mkdir -p ~/.c9"
        });
    }
    else {
        session.install({
            "name": "Node.js", 
            "description": "Node.js " + NODEVERSION
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
            //         "centos": "tmux",
            //         "brew": "tmux"
            //     },
            //     {
            //         "bash": require("text!./tmux.sh")
            //     }
            // ],
            "bash": require("text!./tmux.sh")
        });
    }
    // Show the installation screen
    session.start();
};


});