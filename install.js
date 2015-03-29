define(function(require, exports, module) {
    
module.exports = function(session){
    session.introduction = require("text!./intro.html");

    // Node.js
    session.install({
        "name": "Node.js", 
        "description": "Node.js v0.10.28" 
    }, [
        {
            "tar.gz": { 
                "url": "http://nodejs.org/dist/$NODE_VERSION/node-v0.10.28-$OS-$ARG.tar.gz",
                "target": "~/.c9/node"
            }
        },
        {
            "bash": require("text!./install.sh")
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
        "bash": require("text!./compile-tmux.sh")
    });

    // Installation tasks are stacked (AND) by using an array as the 2nd
    // argument to install()
    session.install({
        "name": "collab-deps",
        "description": "Dependencies for the collaboration features of Cloud9",
        "cwd": "~/.c9"
    }, [
        {
            "npm": ["sqlite3@2.1.18", "sequelize@2.0.0-beta.0"]
        },
        {
            "tar.gz": [
                {
                    "url": "https://raw.githubusercontent.com/c9/install/master/packages/sqlite3/linux/sqlite3.tar.gz",
                    "target": "~/.c9/lib/sqlite3"
                },
                { 
                    "url": "https://raw.githubusercontent.com/c9/install/master/packages/extend/c9-vfs-extend.tar.gz",
                    "target": "~/.c9/c9-vfs-extend"
                }
            ]
        },
        {
            "symlink": {
                    "source": "~/.c9/lib/sqlite3/sqlite3",
                    "target": "~/.c9/bin/sqlite3"
            }
        }
    ]);

    // By specifying optional:true the user can disable the installation of this package
    session.install({
        "name": "Nak",
        "description": "Fast file searches for Cloud9",
        "cwd": "~/.c9",
        "optional": true
    }, {
        "npm": "https://github.com/c9/nak/tarball/c9"
    });

    // Show the installation screen
    session.start();
};


});