define(function(require, exports, module) {
    
module.exports = function(session, options){
    session.introduction = require("text!./install.intro.html");

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
            "bash": require("text!./install.node.sh")
        }
    ]);

    // "Requires" will check any required versions. There's also 
    // "version-greater", "version-lesser", which can be combined
    // The 3rd argument of install() is an optional function that validates
    // the installation of the package.
    session.install({
        "name": "Pty.js",
        "description": "Pseudo Terminal support. Needed by the Cloud9 Terminal",
        "cwd": "~/.c9",
        "requires": [
            { 
                "command": "python --version 2>&1", 
                "version-equal": "2.7",
                "message:": "Python version 2.7 is required to install pty.js."
            }
        ]
    }, {
        "npm": ["node-gyp", "pty.js@0.2.3"]
    }, function(done){
        session.run(
            '"~/.c9/node/bin/node" -e "console.log(require(\'pty.js\'))"',
            function(err, stdout, stderr){
                if (!stdout || stdout.indexOf("createTerminal") == -1)
                    err = new Error("Unknown exception installing pty.js: " + stdout);
                done(err);
            });
    });
    
    // Will try to install tmux via apt-get, yum, etc (OR) and fall backs 
    // on failure to a bash install script
    session.install({
        "name": "tmux", 
        "description": "Tmux - the terminal multiplexer" 
    }, {
        "ubuntu": "tmux",
        "centos": "tmux",
        "bash": require("text!./install.tmux.sh")
    });

    // Show the installation screen
    session.start();
};


});