define(function(require, exports, module) {
    main.consumes = ["Wizard", "WizardPage", "ui", "installer", "Datagrid"];
    main.provides = ["installer.gui"];
    return main;

    function main(options, imports, register) {
        var Wizard = imports.Wizard;
        var WizardPage = imports.WizardPage;
        var ui = imports.ui;
        var installer = imports.installer;
        var Datagrid = imports.Datagrid;
        
        var async = require("async");
        
        /***** Initialization *****/
        
        var plugin = new Wizard("Ajax.org", main.consumes, {
            title: "Cloud9 Setup",
            allowClose: true
        });
        
        var logDiv, spinner, lastOutput, datagrid, aborting;
        var intro, overview, execute, complete;
        var sessions = [];
        
        function load(){
            if (options.testing)
                return plugin.show(true);
            
            installer.on("beforeStart", beforeStart, plugin);
        }
        
        function beforeStart(e){
            aborting = false;
            
            var hasOptional = e.session.tasks.some(function(n){ 
                return n.$options.optional;
            });
            
            if (e.session.introduction || hasOptional) {
                draw();
                
                if (!plugin.visible) {
                    sessions.push(e.session);
                    
                    plugin.startPage = e.session.introduction ? intro : overview;
                    plugin.show(true, { queue: false });
                }
                else {
                    if (plugin.startPage == plugin.activePage) {
                        if (e.session.introduction) {
                            if (plugin.activePage != intro)
                                plugin.previous();
                            
                            updateIntro();
                        }
                        
                        updatePackages();
                    }
                    else {
                        plugin.once("hide", function(){
                            beforeStart(e);
                        });
                    }
                }
            }
            
            return false;
        }
        
        var drawn;
        function draw(){
            if (drawn) return;
            drawn = true;
            
            ui.insertCss(require("text!./style.css"), plugin);
            
            // Page Intro - displays intro texts
            intro = new WizardPage({ name: "intro" }, plugin);
            intro.on("draw", function(e) {
                ui.insertHtml(e.html, 
                    require("text!./pages/intro.html"), intro);
            });
            intro.on("show", function(){
                updateIntro();
            })
            
            // Page Overview - givs an overview of the components to install
            overview = new WizardPage({ name: "overview" }, plugin);
            overview.on("draw", function(e) {
                ui.insertHtml(e.html, 
                    require("text!./pages/overview.html"), overview);
                
                datagrid = new Datagrid({
                    container: e.html.querySelector("blockquote"),
                    
                    columns : [
                        {
                            caption: "Name",
                            value: "name",
                            width: "35%",
                            type: "tree"
                        }, 
                        {
                            caption: "Description",
                            value: "description",
                            width: "65%"
                        }
                    ],
                
                    // getIconHTML: function(node) {
                    //     var icon = node.isFolder ? "folder" : "default";
                    //     if (node.status === "loading") icon = "loading";
                    //     return "<span class='ace_tree-icon " + icon + "'></span>";
                    // }
                }, plugin);
            });
            overview.on("show", function(){
                updatePackages();
            });
            
            // Page Execute - Show Log Output & Checkbox
            execute = new WizardPage({ name: "execute" }, plugin);
            execute.on("draw", function(e) {
                var div = e.html;
                ui.insertHtml(div, require("text!./pages/execute.html"), execute);
                
                logDiv = div.querySelector(".log");
                spinner = div.querySelector(".progress");
                
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
            });
            
            // Page Complete - The installer has finished
            complete = new WizardPage({ name: "complete", last: true }, plugin);
            complete.on("draw", function(e) {
                ui.insertHtml(e.html, require("text!./pages/complete.html"), complete);
            });
            
            plugin.on("previous", function(e) {
                var page = e.activePage;
                // if (page.name == "intro")
                //     plugin.width = 512;
            });
            
            plugin.on("next", function(e) {
                var page = e.activePage;
                if (page.name == "intro") {
                    plugin.resizable = true;
                    // plugin.width = 512;
                    return overview;
                }
                else if (page.name == "overview") {
                    // plugin.width = 610;
                    setTimeout(start);
                    return execute;
                }
                else if (page.name == "execute") {
                    // plugin.width = 610;
                    return complete;
                }
            });
            
            plugin.on("cancel", function(e) {
                if (e.activePage.name == "automatic") {
                    sessions.forEach(function(session){
                        if (session.executing)
                            session.abort(function(){
                                aborting = true;
                                plugin.gotoPage(complete);
                                setCompleteMessage("Use aborted");
                            });
                    });
                }
            });
            
            plugin.startPage = intro;
        }
        
        /***** Methods *****/
        
        function updateIntro(){
            var html = "";
            
            sessions.forEach(function(session){
                html += session.introduction || "";
            });
            intro.container.querySelector("blockquote").innerHTML = html;
        }
        
        function updatePackages(){
            var root = { items: [] };
            
            sessions.forEach(function(session){
                var node = { 
                    label: session.package.name, 
                    description: "Version " + session.package.version,
                    items: []
                };
                root.items.push(node);
                
                session.tasks.forEach(function(task){
                    if (task.$options)
                        node.items.push(task.$options);
                });
            });
            
            datagrid.setRoot(root);
        }
        
        function setCompleteMessage(msg){
            complete.container.querySelector("blockquote").innerHTML = msg;
        }
        
        function log(msg) {
            (lastOutput || logDiv).insertAdjacentHTML("beforeend", msg);
            logDiv.scrollTop = logDiv.scrollHeight;
        }
        
        function logln(msg) {
            logDiv.insertAdjacentHTML("beforeend", msg + "<br />");
            logDiv.scrollTop = logDiv.scrollHeight;
        }
        
        function start(services, callback) {
            plugin.showCancel = true;
            
            plugin.update([
                { id: "previous", visible: false },
                { id: "next", visible: false }
            ]);
            
            // Start Installation
            logln("Starting Installation...");
            spinner.style.display = "block";
            
            var _sessions = sessions.slice(0); // copy sessions
            
            async.eachSeries(_sessions, function(session, next){
                if (aborting) return next();
                
                session.on("each", function(e){
                    logln("Installing " + e.session.package.name 
                        + " " + e.session.package.version);
                });
                session.on("data", function(e){
                    log(e.data);
                    
                    // @TODO detect password: input
                });
                
                session.run(next);
            }, function(err){
                if (err) 
                    return progress(err.message, true, true);
            });
            
            function progress(message, output, error) {
                if (!message.trim()) return;
                if (output) {
                    if (!lastOutput) {
                        log("<div class='output'></div>");
                        lastOutput = logDiv.lastChild;
                    }
                    if (error)
                        message = "<span class='error'>" + message + "</span>";
                    log(message);
                }
                else {
                    lastOutput = null;
                    logln(message);
                }
            }
            
            function done() {
                logDiv.style.paddingBottom = "60px";
                logDiv.scrollTop = logDiv.scrollHeight;
                
                plugin.showCancel = false;
                
                // vfs.stat("~/.c9/installed", {}, function(err, stat) {
                //     if (err) {
                //         logln("<span class='error'>One or more errors occured. "
                //           + "Please try to resolve them and\n"
                //           + "restart Cloud9 or contact support@c9.io.</span>");
                          
                //         spinner.style.display = "none";
                //         logDiv.className = "log details";
                        
                //         plugin.update([
                //             { id: "previous", visible: true },
                //         ]);
                //     }
                //     else {
                //         spinner.style.display = "none";
                        
                //         plugin.showFinish = true;
                //     }
                // });
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
            logDiv = null;
            spinner = null;
            lastOutput = null;
            intro = null;
            overview = null;
            execute = null;
            complete = null;
            drawn = null;
            datagrid = null;
        });
        
        /***** Register and define API *****/
        
        /**
         * Installer for Cloud9
         **/
        plugin.freezePublicAPI({
            
        });
        
        register(null, {
            "installer.gui": plugin
        });
    }
});