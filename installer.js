define(function(require, exports, module) {
    main.consumes = ["Wizard", "WizardPage", "ui"];
    main.provides = ["installer"];
    return main;

    function main(options, imports, register) {
        var Wizard     = imports.Wizard;
        var WizardPage = imports.WizardPage;
        var ui         = imports.ui;
        
        /***** Initialization *****/
        
        var plugin = new Wizard("Ajax.org", main.consumes, {});
        var emit   = plugin.getEmitter();
        
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
        
        var drawn;
        function draw(){
            if (drawn) return;
            drawn = true;
            
            // Page Choice - explain + choice manual vs automatic
            var choice = new WizardPage();
            choice.on("draw", function(options){
                ui.insertHtml(options.container, 
                    require("text!./pages/choice.html"), choice);
                
            });
            
            // Page Automatic - Show Log Output & Checkbox
            var automatic = new WizardPage();
            automatic.on("draw", function(options){
                ui.insertHtml(options.container, 
                    require("text!./pages/automatic.html"), automatic);
                
            });
            
            // Page Manual - Explain the Manual Process (show terminal?) + Button to Retry
            var manual = new WizardPage();
            manual.on("draw", function(options){
                ui.insertHtml(options.container, 
                    require("text!./pages/manual.html"), manual);
                
            });
            
            // Page Done - Message Saying that the Installation has completed Successfully
            var done = new WizardPage();
            done.on("draw", function(options){
                ui.insertHtml(options.container, 
                    require("text!./pages/done.html"), done);
                
            });
            
            // Page Error - Message Saying that the Installation has got an erro
            var error = new WizardPage();
            error.on("draw", function(options){
                ui.insertHtml(options.container, 
                    require("text!./pages/error.html"), error);
                
            });
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