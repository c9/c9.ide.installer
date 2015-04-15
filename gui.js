define(function(require, exports, module) {
    main.consumes = [
        "Wizard", "WizardPage", "ui", "installer", "Datagrid", "settings",
        "menus", "commands"
    ];
    main.provides = ["installer.gui"];
    return main;

    function main(options, imports, register) {
        var Wizard = imports.Wizard;
        var WizardPage = imports.WizardPage;
        var ui = imports.ui;
        var installer = imports.installer;
        var commands = imports.commands;
        var menus = imports.menus;
        var settings = imports.settings;
        var Datagrid = imports.Datagrid;
        
        var async = require("async");
        
        /***** Initialization *****/
        
        var plugin = new Wizard("Ajax.org", main.consumes, {
            title: "Cloud9 Installer",
            allowClose: true,
            class: "installer",
            resizable: true,
            height: 400
        });
        
        var logDiv, spinner, lastOutput, datagrid, aborting;
        var intro, overview, execute, complete;
        var sessions = [];
        var executeList;
        
        function load(){
            if (options.testing)
                return plugin.show(true);
            
            commands.addCommand({
                name: "showinstaller",
                exec: function(editor, args){ 
                    if (plugin.visible) return;
                    
                    if (args && args.packages) {
                        args.packages.forEach(function(name){
                            installer.reinstall(name);
                        });
                        return;
                    }
                    
                    plugin.show();
                    plugin.gotoPage(overview);
                }
            }, plugin);
            
            menus.addItemByPath("Window/Installer...", new ui.item({
                command: "showinstaller"
            }), 38, plugin);
            
            installer.on("beforeStart", beforeStart, plugin);
        }
        
        function beforeStart(e){
            // Run headless if the user has previous chosen that
            if (settings.getBool("user/installer/@auto"))
                return; 
            
            aborting = false;
            
            var session = e.session;
            var hasOptional = session.tasks.some(function(n){ 
                return n.$options.optional;
            });
            
            sessions.push(session);
            
            // Ignore sessions if previously decided not to install
            var prefs = settings.getJson("state/installer");
            
            if (prefs[session.package.name] !== false
              && (session.introduction || hasOptional)) {
                draw();
                
                if (!plugin.visible) {
                    plugin.startPage = session.introduction ? intro : overview;
                    plugin.allowClose = installer.checked;
                    plugin.show(true, { queue: false });
                }
                else {
                    if (plugin.startPage == plugin.activePage) {
                        if (session.introduction) {
                            if (plugin.activePage != intro)
                                plugin.previous();
                            
                            updateIntro();
                        }
                        
                        updatePackages();
                    }
                    else {
                        sessions.remove(session);
                        
                        plugin.once("hide", function(){
                            beforeStart(e);
                        });
                        
                        return;
                    }
                }
            }
            else if (plugin.visible) {
                updatePackages();
            }
            else return;
            
            return false;
        }
        
        var drawn;
        function draw(){
            if (drawn) return;
            drawn = true;
            
            ui.insertCss(require("text!./style.css"), options.staticPrefix, plugin);
            
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
                    enableCheckboxes: true,
                    
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
                    
                    getClassName: function(node){
                        return !node.optional ? "required" : "";
                    }
                
                    // getIconHTML: function(node) {
                    //     var icon = node.isFolder ? "folder" : "default";
                    //     if (node.status === "loading") icon = "loading";
                    //     return "<span class='ace_tree-icon " + icon + "'></span>";
                    // }
                }, plugin);
                
                function updateParents(nodes){
                    var parents = {}, toChildren = {};
                    nodes.forEach(function(n){ 
                        if (!n.parent.label) { // Root
                            toChildren[n.label] = true;
                            parents[n.label] = n;
                        }
                        else if (!n.optional)
                            n.isChecked = true;
                        else
                            parents[n.parent.label] = n.parent;
                    });
                    
                    Object.keys(parents).forEach(function(label){
                        var parent = parents[label];
                        
                        if (toChildren[label]) {
                            var all = true;
                            var hasUnchecked = parent.items.some(function(n){ 
                                return nodes.indexOf(n) == -1 && !n.isChecked 
                            });
                            if (hasUnchecked) parent.isChecked = true;
                            
                            parent.items.forEach(function(n){
                                if (!n.optional) all = false;
                                else n.isChecked = parent.isChecked ? true : false;
                            });
                            if (!all && !parent.isChecked)
                                parent.isChecked = -1;
                            return;
                        }
                        
                        var state = 0;
                        parent.items.forEach(function(n){
                            if (n.isChecked) state++;
                        });
                        if (state == parent.items.length)
                            parent.isChecked = true;
                        else
                            parent.isChecked = state ? -1 : false;
                    });
                    
                    if (getSelectedSessions().length === 0) {
                        plugin.showFinish = true;
                        plugin.showNext = false;
                    }
                    else {
                        plugin.showFinish = false;
                        plugin.showNext = true;
                    }
                }
                
                datagrid.on("check", updateParents);
                datagrid.on("uncheck", updateParents);
            });
            overview.on("show", function(){
                updatePackages();
                
                if (getSelectedSessions().length === 0) {
                    plugin.showFinish = true;
                    plugin.showNext = false;
                }
                else {
                    plugin.showFinish = false;
                    plugin.showNext = true;
                }
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
            complete = new WizardPage({ name: "complete" }, plugin);
            complete.on("draw", function(e) {
                ui.insertHtml(e.html, require("text!./pages/complete.html"), complete);
                setCompleteMessage();
                plugin.showPrevious = false;
                plugin.showFinish = true;
            });
            
            // plugin.on("previous", function(e) {
            //     var page = e.activePage;
            // });
            
            plugin.on("next", function(e) {
                var page = e.activePage;
                if (page.name == "intro") {
                    return overview;
                }
                else if (page.name == "overview") {
                    setTimeout(start);
                    return execute;
                }
                else if (page.name == "execute") {
                    plugin.showFinish = true;
                    plugin.showPrevious = false;
                    plugin.showNext = false;
                    return complete;
                }
            });
            
            plugin.on("cancel", function(e) {
                if (e.activePage.name == "execute") {
                    aborting = true;
                    
                    setCompleteMessage("Installation Aborted",
                        require("text!./install/aborted.html"));
                    
                    plugin.gotoPage(complete);
                    plugin.showCancel = false;
                        
                    executeList.forEach(function(session){
                        if (session.executing)
                            session.abort();
                    });
                }
            });
            
            plugin.on("finish", function(e){
                var cbAlways = plugin.getElement("cbAlways");
                if (!cbAlways.checked || e.activePage.name == "complete") return;
                runHeadless();
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
            if (!datagrid) return;
            
            var root = { items: [] };
            
            // Ignore sessions if previously decided not to install
            var prefs = settings.getJson("state/installer");
            
            sessions.forEach(function(session){
                var node = { 
                    label: session.package.name, 
                    description: "Version " + session.package.version,
                    session: session,
                    items: [],
                    isOpen: false,
                    isChecked: prefs[session.package.name] !== false
                };
                root.items.push(node);
                
                var sessionState = prefs[session.package.name] || {};
                var optional = false;
                session.tasks.forEach(function(task){
                    var options = task.$options;
                    if (!options) return;
                    
                    if (options.isChecked === undefined)
                        options.isChecked = true;
                    node.items.push(options);
                    if (options.optional)
                        optional = true;
                    options.ignore = sessionState[options.name] || false;
                });
                
                node.optional = optional;
            });
            
            datagrid.setRoot(root);
        }
        
        var lastComplete;
        function setCompleteMessage(title, msg){
            if (!complete.container)
                return (lastComplete = [title, msg]);
                
            complete.container.querySelector("h3").innerHTML = title || lastComplete[0];
            complete.container.querySelector("blockquote").innerHTML = msg || lastComplete[1];
        }
        
        function getSelectedSessions(ignored, state){
            var sessions = [];
            
            var nodes = datagrid.root.items;
            nodes.filter(function(node){
                var include = typeof node.isChecked == "boolean"
                    ? node.isChecked
                    : true;
                
                var session = node.session;
                if (!include) {
                    state[session.package.name] = false;
                    if (ignored) ignored.push(session);
                    return false;
                }
                
                var sessionState = state[session.package.name] = {};
                session.tasks.forEach(function(task){
                    task.$options.ignore = task.$options.isChecked === false;
                    sessionState[task.$options.name] = task.$options.ignore;
                });
                
                sessions.push(session);
            });
            
            return sessions;
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
            
            plugin.showPrevious = false;
            plugin.showNext = false;
            
            // Start Installation
            logln("Starting Installation...");
            spinner.style.display = "block";
            
            var aborted = [];
            var state = {};
            executeList = getSelectedSessions(aborted, state);
            sessions = [];
            
            // Store selection in state settings
            settings.setJson("state/installer", state);
            
            // Abort sessions that won't be run
            aborted.forEach(function(session){
                session.abort();
            });
            
            // Run all selected sessions
            async.eachSeries(executeList, function(session, next){
                if (aborting) return next(new Error("Aborted"));
                
                session.on("run", function(){
                    logln("Package " + session.package.name 
                        + " " + session.package.version);
                });
                
                var lastOptions;
                session.on("each", function(e){
                    if (lastOptions != e.options) {
                        lastOptions = e.options;
                        if (e.options.name)
                            logln("Installing " + e.options.name);
                    }
                });
                session.on("data", function(e){
                    log(e.data);
                    
                    // @TODO detect password: input
                });
                
                session.start(next, true);
            }, function(err){
                logDiv.scrollTop = logDiv.scrollHeight;
                
                plugin.showCancel = false;
                
                if (err) {
                    logln("<br />" + err.message + "<br /><br />"
                      + "<span class='error'>One or more errors occured. "
                      + "Please try to resolve them and\n"
                      + "restart Cloud9 or contact support@c9.io.</span>");
                      
                    spinner.style.display = "none";
                    logDiv.className = "log details";
                    
                    if (plugin.activePage.name == "execute")
                        plugin.showFinish = true;
                }
                else {
                    spinner.style.display = "none";
                    
                    setCompleteMessage("Installation Complete",
                        require("text!./install/success.html")
                            .replace("{{sessions}}", executeList.map(function(s){
                                return s.package.name + " " + s.package.version;
                            }).join("</li><li>")));
                    plugin.showNext = true;
                }
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
        }
        
        function runHeadless(){
            sessions.forEach(function(session){
                session.start(function(){}, true);
            });
        }
        
        /***** Lifecycle *****/
        
        plugin.on("draw", function(){
            draw();
            
            // Add Checkbox to toggle Always Installation
            plugin.createElement({ 
                id: "cbAlways", 
                type: "checkbox", 
                caption: "Always install everything", 
                position: 150
            });
            
            var lastState = {};
            plugin.getElement("cbAlways").on("afterchange", function(e){
                if (e.value) {
                    ["showCancel", "showFinish", "showNext", "showPrevious"]
                        .forEach(function(n){ lastState[n] = plugin[n]; });
                    
                    plugin.showCancel = false;
                    plugin.showFinish = true;
                    plugin.showNext = false;
                    plugin.showPrevious = false;
                }
                else {
                    ["showCancel", "showFinish", "showNext", "showPrevious"]
                        .forEach(function(n){ plugin[n] = lastState[n]; });
                }
                
                settings.set("user/installer/@auto", e.value);
            });
        });
        
        plugin.on("load", function(){
            load();
        });
        
        plugin.on("unload", function(){
            aborting = false;
            logDiv = null;
            spinner = null;
            lastOutput = null;
            intro = null;
            overview = null;
            execute = null;
            complete = null;
            drawn = null;
            datagrid = null;
            lastComplete = null;
            executeList = null;
            sessions = [];
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