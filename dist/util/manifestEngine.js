//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//
//    Copyright (c) Zenasoft
//
"use strict";
const glob = require('glob');
const ejs = require('ejs');
const os = require('os');
const fs = require('fs');
const path = require('path');
const child_process = require("child_process");
class Engine {
    constructor(meta) {
        this.meta = meta;
        if (meta.baseDir)
            this.manifestPath = path.join(this.meta.baseDir, "template.manifest");
        else
            this.manifest = meta;
    }
    updateMeta(info) {
        this.meta.teamName = info.team;
        this.meta.project.namespace = info.ns;
        this.meta.project.safeName = info.safeName;
        this.meta.project.name = info.name;
        this.meta.project.fullName = info.ns + "." + info.name;
        this.meta.hub = info.hub;
    }
    readManifest() {
        if (!this.manifest) {
            if (fs.existsSync(this.manifestPath)) {
                try {
                    this.manifest = JSON.parse(fs.readFileSync(this.manifestPath, "utf8"));
                }
                catch (e) {
                    this.manifest = {};
                    throw new Error("Error when reading template.manifest " + e);
                }
            }
        }
        return this.manifest;
    }
    transform() {
        // find manifest
        let manifest = this.readManifest();
        if (manifest && manifest.transform && manifest.transform.replace) {
            manifest.transform.replace.forEach(rule => {
                this.replace(rule.filter, rule.context);
            });
        }
        if (manifest && manifest.transform && manifest.transform.rename) {
            manifest.transform.rename.forEach(item => {
                this.rename(item.filter, new RegExp(item.pattern, "gi"), item.target);
            });
        }
        if (manifest && manifest.transform && manifest.transform.attributes && os.platform() !== "win32") {
            manifest.transform.attributes.forEach(item => {
                this.chmod(item.filter, item.mode);
            });
        }
    }
    displayMessage(step) {
        let manifest = this.readManifest();
        if (manifest && manifest.messages) {
            let messages = manifest.messages[step];
            if (messages) {
                console.log("");
                messages.forEach((msg) => console.log("INFO : " + msg));
                console.log("");
            }
        }
    }
    execScripts(step = "install") {
        let manifest = this.readManifest();
        if (manifest && manifest.scripts) {
            let platform = os.platform() === "win32" ? "win32" : "*nix";
            let scripts = manifest.scripts[platform] || manifest.scripts.all;
            let commands = scripts && scripts[step];
            commands && commands.forEach((cmd) => this.exec(cmd));
        }
    }
    exec(command) {
        if (command) {
            console.log("*** Running : " + command);
            child_process.execSync(command, { cwd: this.meta.baseDir });
        }
    }
    resolveProperty(name) {
        name = name.substr(1, name.length - 2); // remove {..}
        var parts = name.split(".");
        var root = this.meta;
        parts.forEach(p => {
            if (root) {
                root = root[p];
            }
        });
        return root;
    }
    rename(filter, pattern, target) {
        // Prepare target
        var rg = /{([^}]*)}/g;
        var properties = target.match(rg);
        // Replace substitution variables with theirs values 
        properties.forEach(p => {
            target = target.replace(p, this.resolveProperty(p));
        });
        // Find file to rename
        var files = glob.sync(filter, { cwd: this.meta.baseDir });
        for (var n in files) {
            var file = path.join(this.meta.baseDir, files[n]);
            var fileName = path.basename(file);
            fileName = fileName.replace(pattern, target);
            fs.rename(file, path.join(this.meta.baseDir, fileName));
        }
    }
    chmod(filter, mode) {
        var files = glob.sync(filter, { cwd: this.meta.baseDir });
        for (var n in files) {
            var file = path.join(this.meta.baseDir, files[n]);
            fs.chmodSync(file, mode);
        }
    }
    replace(filter, data) {
        this.meta.data = data;
        var files = glob.sync(filter, { cwd: this.meta.baseDir });
        for (var n in files) {
            var file = path.join(this.meta.baseDir, files[n]);
            var txt = fs.readFileSync(file, "utf8");
            this.meta.fileName = file;
            var txt2 = ejs.render(txt, this.meta);
            fs.writeFileSync(file, txt2);
        }
    }
}
exports.Engine = Engine;

//# sourceMappingURL=manifestEngine.js.map
