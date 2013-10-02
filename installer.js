/**
 * File Finder module for the Cloud9 IDE that uses nak
 *
 * @copyright 2012, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {
    main.consumes = ["c9", "Plugin", "proc", "fs", "ui"];
    main.provides = ["installer"];
    return main;

    function main(options, imports, register) {
        var Plugin   = imports.Plugin;
        var c9       = imports.c9;
        var fs       = imports.fs;
        var ui       = imports.ui;
        var proc     = imports.proc;
        
        /***** Initialization *****/
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        // var emit   = plugin.getEmitter();
        
        var core = [
            "c9", "vfs", "fs", "proc", "net", "layout"
        ];
        var logDiv, lastOutput, button, spinner;
        
        function install(callback, progress){
            progress("Adding c9 cli to the PATH");
            
            var add, remove, line;
            var init = "SCRIPT=`[ -e ~/.bash_profile ] && echo .bash_profile || ([ -e ~/.bashrc ] && echo .bashrc || echo .profile)`";
            if (options.platform == "darwin") {
                line   = "export PATH=~/Applications/cloud9.app/Contents/"
                    + "Resources/app.nw/bin:$PATH";
                add    = "echo '" + line + "' >> $SCRIPT";
                remove = 'sed -i "" '
                    + '"s/export PATH=~\\/Applications\\/cloud9.app.*//" '
                    + '$SCRIPT';
            }
            else if (options.platform == "linux") {
                line   = "export PATH=~/bin:$PATH";
                add    = "echo '" + line + "' >> $SCRIPT";
                remove = 'sed -i '
                    + '"s/export PATH=~\\/bin.*//" '
                    + '$SCRIPT';
            }
            
            proc.execFile("bash", {
                args: ["-c", init + " && " + remove + " && " + add]
            }, function(err, stdout, stderr){
                if (err || stderr) return callback(err || stderr);
                
                progress(stdout, true);
                progress("Creating .c9 folder in homedir");
                fs.mkdir("~/.c9", function(err){
                    
                    fs.exists("~/.c9/version", function(exists){
                        if (!exists) {
                            fs.rename("~/Applications/cloud9.app/Contents/"
                                + "Resources/app.nw/version",
                                "~/.c9/version", function(){
                                    callback(err);
                                });
                        }
                        else
                            callback(err);
                    });
                });
            });
        }
        
        var loaded = false;
        function load(){
            if (loaded) return;
            loaded = true;
            
            var div = document.body.appendChild(document.createElement("div"));
            div.className = "installer";
            div.innerHTML = require("text!./installer.html");
            
            ui.insertCss(require("text!./style.css"), options.staticPrefix, plugin);
            
            logDiv   = div.querySelector(".log");
            button   = div.querySelector("button");
            spinner  = div.querySelector(".progress");
            
            var cb = document.querySelector("#details");
            cb.addEventListener("click", function(){
                if (cb.checked) {
                    document.querySelector(".log").className = "log details";
                }
                else {
                    document.querySelector(".log").className = "log";
                }
            });
            
            plugin.addOther(function(){
                div.innerHTML = "";
                div.parentNode.removeChild(div);
            });
            
            c9.on("stateChange", function(e){
                if (!(e.state & c9.NETWORK)) {
                    spinner.innerHTML = "<div style='color:orange'>Lost network "
                        + "connection. Please restart Cloud9 IDE and "
                        + "try again.</div>";
                }
            }, plugin);
        }
        
        /***** Methods *****/
        
        function log(msg){
            (lastOutput || logDiv).insertAdjacentHTML("beforeend", msg);
            logDiv.scrollTop = logDiv.scrollHeight;
        }
        
        function logln(msg){
            logDiv.insertAdjacentHTML("beforeend", msg + "<br />");
            logDiv.scrollTop = logDiv.scrollHeight;
        }
        
        function start(services, callback){
            // Initialize core services
            core.forEach(function(name){
                if (services[name] && !services[name].name)
                    services[name].name = name;
            });
            if (services.local)
                services.local.installMode();
            
            var errors = [];
            var i = 0, keys = Object.keys(services);
            
            function next(err){
                if (err) { 
                    errors.push(err);
                    logln("<div class='error'>" + (err.message || err) + "</div>");
                    return done();
                }
                
                var plugin = services[keys[i++]];
                if (!plugin)
                    return done();
                
                if (plugin.install)
                    plugin.install(next, progress);
                else next();
            }
            
            function progress(message, output, error){
                if (!message.trim()) return;
                if (output) {
                    if (!lastOutput) {
                        log("<div class='output'></div>");
                        lastOutput = logDiv.lastChild;
                    }
                    // if (error)
                    //     message = "<span class='error'>" + message + "</span>";
                    log(message);
                }
                else {
                    lastOutput = null;
                    logln(message);
                }
            }
            
            function done(){
                logDiv.style.paddingBottom = "60px";
                logDiv.scrollTop = logDiv.scrollHeight;
                
                button.onclick = function(){
                    plugin.unload();
                    callback();
                };
                
                if (errors.length) {
                    logln("<span class='error'>"
                      + (errors.length == 1
                        ? "An error occured. "
                        : "There were " + errors.length + " errors. ")
                      + "Please try to resolve " 
                      + (errors.length == 1 ? "it" : "them")
                      + " and restart cloud9 or contact support@c9.io.</span>");
                      
                    button.style.display = "block";
                    spinner.style.display = "none";
                }
                else {
                    fs.writeFile("~/.c9/installed", "1", function(){
                        logln("Done.");
                        button.style.display = "block";
                        spinner.style.display = "none";
                    });
                }
            }
            
            // Start Installation
            logln("Starting Installation...");
            next();
        }
        
        /***** Lifecycle *****/
        
        plugin.on("install", function(e){
            install(e.next, e.progress);
            return false;
        });
        plugin.on("load", function(){
            load();
        });
        
        plugin.on("unload", function(){
        });
        
        /***** Register and define API *****/
        
        /**
         * Installer for Cloud9 IDE
         **/
        plugin.freezePublicAPI({
            /**
             * 
             */
            start : start
        });
        
        register(null, {
            installer: plugin
        });
    }
});