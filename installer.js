define(function(require, exports, module) {
    main.consumes = ["Wizard", "WizardPage", "ui"];
    main.provides = ["installer"];
    return main;

    function main(options, imports, register) {
        var Wizard     = imports.Wizard;
        var WizardPage = imports.WizardPage;
        var ui         = imports.ui;
        
        /***** Initialization *****/
        
        var plugin = new Wizard("Ajax.org", main.consumes, {
            title: "Installation Wizard"
        });
        var emit   = plugin.getEmitter();
        
        var logDiv, spinner, lastOutput;
        
        var loaded = false;
        function load(){
            if (loaded) return;
            loaded = true;
            
            plugin.on("cancel", function(e){
                if (e.page.name == "automatic") {
                    // @todo fjakobs - cancel the installation
                }
                // @todo return to the dashboard
            });
            
            plugin.on("finish", function(e){
                if (e.page.name == "manual") {
                    // @todo fjakobs
                }
                else if (e.page.name == "automatic") {
                    // @todo fjakobs
                }
            });
            
            plugin.show(true);
        }
        
        var drawn;
        function draw(){
            if (drawn) return;
            drawn = true;
            
            ui.insertCss(require("text!./style.css"), plugin);
            
            // Page Choice - explain + choice manual vs automatic
            var choice = new WizardPage({ name: "choice" });
            choice.on("draw", function(options){
                ui.insertHtml(options.html, 
                    require("text!./pages/choice.html"), choice);
                
            });
            
            // Page Automatic - Show Log Output & Checkbox
            var automatic = new WizardPage({ name: "automatic" });
            automatic.on("draw", function(options){
                var div = options.html;
                ui.insertHtml(div, require("text!./pages/automatic.html"), automatic);
                
                logDiv   = div.querySelector(".log");
                spinner  = div.querySelector(".progress");
                
                var cb = div.querySelector("#details");
                cb.addEventListener("click", function(){
                    if (cb.checked) {
                        logDiv.className = "log details";
                    }
                    else {
                        logDiv.className = "log";
                    }
                });
                
                plugin.addOther(function(){
                    div.innerHTML = "";
                    div.parentNode.removeChild(div);
                });
                
                // c9.on("stateChange", function(e){
                //     if (!(e.state & c9.NETWORK)) {
                //         spinner.innerHTML = "<div style='color:orange'>Lost network "
                //             + "connection. Please restart Cloud9 IDE and "
                //             + "try again.</div>";
                //     }
                // }, plugin);
                
                start();
            });
            
            // Page Manual - Explain the Manual Process (show terminal?) + Button to Retry
            var manual = new WizardPage({ name: "manual", last: true });
            manual.on("draw", function(options){
                ui.insertHtml(options.html, 
                    require("text!./pages/manual.html"), manual);
                
            });
            
            plugin.on("next", function(e){
                var page = e.activePage;
                if (page.name == "choice") {
                    var rb = page.container.querySelector("#auto");
                    return rb.checked ? automatic : manual;
                }
            });
            
            plugin.startPage  = choice;
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
            plugin.showCancel = true;
            
            plugin.update([
                { id: "previous", visible: false },
                { id: "next", visible: false }
            ]);
            
            // Start Installation
            logln("Starting Installation...");
            
            // @fjakobs push errors to this array if any
            var errors = [];
            
            // @todo: @fjakobs do your thing here
            progress("Installing Nak...");
            progress("Hello ", true);
            progress("World.", true);
            progress("Done.");
            progress("Installing TMUX...");
            progress("Goodbye ", true);
            progress("Cruel ", true);
            progress("World.", true);
            progress("Done.");
            
            done();
            
            function progress(message, output, error){
                if (!message.trim()) return;
                if (output) {
                    if (!lastOutput) {
                        log("<div class='output'></div>");
                        lastOutput = logDiv.lastChild;
                    }
                    if (error)
                        errors.push(error);
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
                
                plugin.showCancel = false;
                
                if (errors.length) {
                    logln("<span class='error'>"
                      + (errors.length == 1
                        ? "An error occured. "
                        : "There were " + errors.length + " errors. ")
                      + "Please try to resolve " 
                      + (errors.length == 1 ? "it" : "them")
                      + " and restart cloud9 or contact support@c9.io.</span>");
                      
                    spinner.style.display = "none";
                    
                    plugin.update([
                        { id: "previous", visible: true },
                    ]);
                }
                else {
                    logln("Done.");
                    spinner.style.display = "none";
                    
                    plugin.showFinish = true;
                }
            }
        }
        
        /***** Lifecycle *****/
        
        plugin.on("draw", function(){
            draw();
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