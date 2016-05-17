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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fs = require('fs');
const Path = require('path');
const URL = require('url');
const manifestEngine_1 = require('../util/manifestEngine');
var exec = require('child_process').exec;
var rest = require('unirest');
var git = require('gift');
var util = require('util');
var Promise = require('promise');
(function (Action) {
    Action[Action["AddExistingProject"] = 1] = "AddExistingProject";
    Action[Action["DontRegister"] = 2] = "DontRegister";
    Action[Action["Create"] = 4] = "Create";
    Action[Action["Clone"] = 8] = "Clone";
})(exports.Action || (exports.Action = {}));
var Action = exports.Action;
class CreateProjectExecutor {
    constructor(vorpal, options, action) {
        this.vorpal = vorpal;
        this.options = options;
        this.action = action;
        this.doNotRemoveFolder = false;
        this.engine = new manifestEngine_1.Engine({ project: {} });
        //		this.engine.meta.user = this.options.user && (<string>this.options.user).split(":")[0];
        this.requestData =
            {
                name: this.options.project,
                template: this.options.template,
                description: this.options.description,
                env: this.options.env,
                templateRequired: action === Action.Create || action === Action.DontRegister,
                team: this.options.team,
                isPackage: this.options.package
            };
    }
    sendRequest(request) {
        return new Promise((resolve) => {
            request.end(resolve);
        });
    }
    prepareFolder(info) {
        if (!this.options.folder) {
            let env = process.env["VULCAIN_PROJECT"];
            if (!env) {
                this.options.folder = process.cwd();
            }
            else {
                env = env.replace(/["']/g, "").trim();
                if (this.action === Action.DontRegister)
                    this.options.folder = Path.join(env, "_tests");
                else
                    this.options.folder = Path.join(env, info.team);
            }
        }
        else if (this.options.folder === ".") {
            this.options.folder = process.cwd();
        }
        try {
            this.mkdir(this.options.folder);
        }
        catch (err) {
            this.vorpal.log("*** Cannot create target folder : " + err);
            return false;
        }
    }
    executeAsync() {
        return __awaiter(this, void 0, Promise, function* () {
            this.vorpal.log("*** Get project informations from vulcain at " + this.options.server + "...");
            var request = rest.post(this.options.server + "/api/v1/register")
                .header('Accept', 'application/json')
                .header('Authorization', "ApiKey " + this.options.token)
                .type("json")
                .send(this.requestData);
            let response = yield this.sendRequest(request);
            if (response.ok) {
                var info = response.body;
                this.engine.updateMeta(info);
                if (this.action !== Action.AddExistingProject)
                    this.prepareFolder(info);
                if (this.action === Action.Clone)
                    return yield this.runClone(info);
                else
                    return yield this.runCreate(info);
            }
            this.vorpal.log("*** Error occured : " + (response.body && response.body.message || response.body || response.statusMessage || response.error));
            if (response.body && response.body.errors) {
                response.body.errors.forEach(err => {
                    this.vorpal.log(err.message);
                });
            }
            return false;
        });
    }
    runClone(info) {
        return __awaiter(this, void 0, void 0, function* () {
            this.vorpal.log("*** Cloning project " + this.engine.meta.project.fullName);
            try {
                var url = URL.parse(info.gitUrl);
                if (this.options.userName && this.options.password)
                    url.auth = this.options.userName + ":" + this.options.password;
                yield this.clone(URL.format(url), this.options.folder);
                yield this.gitCommit(info.projectUrl);
                try {
                    this.engine.execScripts("clone");
                }
                catch (err) {
                    // Not critical
                    this.vorpal.log("*** Error when running scripts : " + err);
                }
                this.vorpal.log("Project cloned in " + this.engine.meta.baseDir);
                return true;
            }
            catch (e) {
                this.vorpal.log("*** " + e);
                this.vorpal.log("*** Can be an authorization error. Use -u and -p options to provide credentials.");
                try {
                    this.deleteFolderRecursive(this.engine.meta.baseDir, true);
                }
                catch (ex) {
                    this.vorpal.log("*** " + ex);
                }
            }
        });
    }
    runCreate(info) {
        return __awaiter(this, void 0, void 0, function* () {
            this.vorpal.log("*** Creating project " + this.engine.meta.project.fullName);
            try {
                let dir = yield this.clone(info.template, this.options.folder);
                if (this.action !== Action.DontRegister) {
                    dir = yield this.createNewGitRepository(dir);
                    yield this.registerService(dir, info);
                    yield this.gitCommit(info.projectUrl);
                }
                else {
                    try {
                        this.engine.execScripts();
                    }
                    catch (err) {
                        // Not critical
                        this.vorpal.log("*** Error when running scripts : " + err);
                    }
                }
                this.vorpal.log("Project created in " + this.engine.meta.baseDir);
                this.engine.displayMessage("end");
                return true;
            }
            catch (e) {
                this.vorpal.log("*** " + e);
                try {
                    if (this.action !== Action.AddExistingProject && !this.doNotRemoveFolder)
                        this.deleteFolderRecursive(this.engine.meta.baseDir, true);
                }
                catch (ex) {
                    this.vorpal.log("*** " + ex);
                }
            }
        });
    }
    mkdir(path) {
        path = Path.normalize(path);
        let pathInfo = Path.parse(path);
        if (path.length >= pathInfo.root.length && path.substr(0, pathInfo.root.length) === pathInfo.root)
            path = path.substr(pathInfo.root.length);
        let chunks = path.split(Path.sep);
        if (chunks[0] == "")
            chunks.shift();
        this.mkdirRecursive(pathInfo.root, chunks);
    }
    mkdirRecursive(base, chunks) {
        let chunk = chunks.shift();
        if (!chunk)
            return;
        let path = Path.join(base, chunk);
        if (!fs.existsSync(path)) {
            let err = fs.mkdirSync(path);
            if (err)
                throw err;
        }
        this.mkdirRecursive(path, chunks);
    }
    registerService(dir, info) {
        return new Promise((resolve, reject) => {
            if (this.options.clone) {
                resolve(true);
                return;
            }
            this.vorpal.log("*** Registering project in vulcain...");
            var request = rest.post(this.options.server + "/api/v1/register/commit")
                .header('Accept', 'application/json')
                .header('Authorization', "ApiKey " + this.options.token)
                .type("json")
                .send(this.requestData);
            request.end(response => {
                if (response.ok) {
                    this.vorpal.log("*** Project registered with success.");
                    this.doNotRemoveFolder = true;
                    resolve(true);
                    return;
                }
                reject(util.format("Unable to register project - %j", ((response.body && response.body.message) || response.body || response.statusMessage)));
            });
        });
    }
    deleteFolderRecursive(path, first = false) {
        if (path && fs.existsSync(path)) {
            if (first) {
                this.vorpal.log("** Removing project directory...");
            }
            fs.readdirSync(path).forEach((file, index) => {
                var curPath = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    this.deleteFolderRecursive(curPath);
                }
                else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    }
    createNewGitRepository(local) {
        return new Promise((resolve, reject) => {
            this.engine.meta.baseDir = local;
            this.engine.displayMessage("start");
            this.deleteFolderRecursive(Path.join(local, ".git"), false);
            git.init(local, (err, repo) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.vorpal.log("*** Processing Manifest - Updating source files...");
                try {
                    this.engine.transform();
                }
                catch (e) {
                    reject(e);
                    return;
                }
                resolve(local);
            });
        });
    }
    gitCommit(newRepositoryUrl) {
        return new Promise((resolve, reject) => {
            let local = this.engine.meta.baseDir;
            try {
                this.engine.execScripts();
            }
            catch (err) {
                // Not critical
                this.vorpal.log("*** Error when running scripts : " + err);
            }
            let repo = git(local);
            this.vorpal.log("*** Committing changes...");
            repo.add(".", err => {
                if (err) {
                    reject(err);
                    return;
                }
                repo.commit("Initial commit", err => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (this.options.clone) {
                        resolve(local);
                        return;
                    }
                    this.vorpal.log("*** Switching git remote to " + newRepositoryUrl);
                    repo.remote_add("origin", newRepositoryUrl, err => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(local);
                    });
                });
            });
        });
    }
    clone(templateUrl, folder) {
        return new Promise((resolve, reject) => {
            if (this.action === Action.AddExistingProject) {
                this.vorpal.log("*** Adding project from folder " + folder);
                this.doNotRemoveFolder = true;
                this.engine.meta.baseDir = folder;
                resolve(folder);
                return;
            }
            let local = Path.join(this.options.folder, this.engine.meta.project.name);
            if (fs.existsSync(local)) {
                this.doNotRemoveFolder = true;
                reject("destination path " + local + " already exists");
                return;
            }
            this.engine.meta.baseDir = local;
            this.vorpal.log("*** Cloning repository into " + local + "...");
            git.clone(templateUrl, local, 1, (err, repo) => {
                if (err) {
                    if (err.message) {
                        var pos = err.message.indexOf("fatal");
                        if (pos > 0)
                            err = err.message.substr(pos + 6);
                    }
                    reject(err);
                }
                else
                    resolve(local);
            });
        });
    }
}
exports.CreateProjectExecutor = CreateProjectExecutor;

//# sourceMappingURL=projectCreateExecutor.js.map
