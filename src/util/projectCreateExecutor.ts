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
import * as os from 'os'
import * as fs from 'fs'
import * as Path from 'path'
import * as URL from 'url'
import {Engine} from '../util/manifestEngine'
var exec = require('child_process').exec;
var rest = require('unirest')
var git = require('gift')
var util = require('util');
var Promise = require('promise');
var copy = require('copy-paste');

export enum Action {
    AddExistingProject = 1,
    DontRegister = 2,
    Create = 4,
    Clone = 8
}

export class CreateProjectExecutor {
    private requestData;
    private engine: Engine;
    private doNotRemoveFolder = false;

    constructor(private vorpal, private options, private action: Action) {
        this.engine = new Engine(vorpal);
        //		this.engine.meta.user = this.options.user && (<string>this.options.user).split(":")[0];
        this.requestData =
            {
                name: this.options.project,
                template: this.options.template,
                description: this.options.description,
                env: this.options.env,
                templateRequired: action === Action.Create || action === Action.DontRegister,
                team: this.options.team,
                isPackage: this.options.package,
                action: action === Action.Create ? "create" :
                    action === Action.Clone ? "clone" :
                    action === Action.AddExistingProject ? "add" :
                    "test"        
            };
    }

    private sendRequest(request) {
        return new Promise((resolve) => {
            request.end(resolve);
        })
    }

    private prepareFolder(info)
    {
        if (!this.options.folder) {
            let env = this.options.defaultFolder || process.env["VULCAIN_PROJECT"];
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
    
    async executeAsync(): Promise<boolean> {

        this.vorpal.log("*** Get project informations from vulcain at " + this.options.server + "...");

        var request = rest.post(this.options.server + "/api")
            .header('Accept', 'application/json')
            .header('Authorization', "ApiKey " + this.options.token)
            .type("json")
            .timeout(5000)
            .send({ action: "registerService", schema:"Service", data: this.requestData });

        try {
            let response = await this.sendRequest(request);
            if (response.ok) {
                var info = response.body;
                if (info.status === "Error") {
                    this.vorpal.log(info.error.message);
                    return false;
                }
                info = info.value;
                this.engine.updateMeta(info);

                if (this.action !== Action.AddExistingProject)
                    this.prepareFolder(info);

                if (this.action === Action.Clone)
                    return await this.runClone(info);
                else if (this.action === Action.AddExistingProject)
                    return await this.runAdd(info);
                else
                    return await this.runCreate(info);
            }

            this.vorpal.log("*** Error occured : " + (response.body && response.body.error || response.body || response.statusMessage || response.error));
            if (response.body && response.body.errors) {
                response.body.errors.forEach(err => {
                    this.vorpal.log(err.message);
                });
            }
        }
        catch (e) {
            this.vorpal.log(e);
        }
        return false;
    }

    protected async runClone(info) {
        this.vorpal.log("*** Cloning project " + this.engine.meta.project.fullName);
        try {
            var url = URL.parse(info.projectUrl);
            if(this.options.userName && this.options.password)
                url.auth = this.options.userName + ":" + this.options.password;
            await this.clone(URL.format(url), this.options.folder)

            try {
                await this.engine.execScriptsAsync("clone");
            }
            catch (err) {
                // Not critical
                this.vorpal.log("*** Error when running scripts : " + err);
            }
            this.vorpal.log("Project cloned in " + this.engine.meta.baseDir);
            copy.copy(this.engine.meta.baseDir);
            this.vorpal.log("Copy project folder in clipboard.")
            return true;
        }
        catch (e) {
            this.vorpal.log("*** " + e);
            this.vorpal.log("*** Can be an authorization error. Use -u and -p options to provide credentials.")
            try {
                this.deleteFolderRecursive(this.engine.meta.baseDir, true);
            }
            catch (ex) {
                this.vorpal.log("*** " + ex);
            }
        }
    }
    
    protected async runAdd(info) {
        this.vorpal.log("*** adding project " + this.engine.meta.project.fullName);
        try {
            await this.registerService(this.options.folder, info);
            return true;
        }
        catch (e) {
            this.vorpal.log("*** " + e);
        }
    }
    
    protected async runCreate(info) {
        this.vorpal.log("*** Creating project " + this.engine.meta.project.fullName);
        try
        {
            let dir = await this.clone(info.template, this.options.folder)
            if (this.action !== Action.DontRegister) {
                dir = await this.createNewGitRepository(dir);
                await this.registerService(dir, info);
                await this.gitCommit(info.projectUrl);
            }
            else {
                try {
                    await this.gitRemoveOrigin();
                    this.vorpal.log("*** Processing Manifest - Updating source files...");
                    try {
                        this.engine.transform();
                    }
                    catch (e) {
                        this.vorpal.log("*** Error when updating source files - " + e);
                    }
                    await this.engine.execScriptsAsync();
                }
                catch (err) {
                    // Not critical
                    this.vorpal.log("*** Error when running scripts : " + err);
                }
            }
            this.vorpal.log("Project created in " + this.engine.meta.baseDir);
            copy.copy(this.engine.meta.baseDir);
            this.vorpal.log("Copy project folder in clipboard.")
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
    }
    
    private mkdir(path:string) 
    {
        path = Path.normalize(path);
        let pathInfo = Path.parse(path);
        if( path.length >= pathInfo.root.length && path.substr(0, pathInfo.root.length) === pathInfo.root)
            path = path.substr(pathInfo.root.length);
            
        let chunks = path.split(Path.sep); 
        if(chunks[0] == "")
            chunks.shift();
       
        this.mkdirRecursive(pathInfo.root, chunks);            
    }
    
    private mkdirRecursive(base:string, chunks:Array<string>)
    {
        let chunk = chunks.shift();
        if(!chunk) return;
        if (chunk === "~") chunk = os.homedir();
        let path = Path.join(base, chunk);
        if(!fs.existsSync(path)) {
            let err = fs.mkdirSync(path);
            if(err)
                throw err;
        }
        this.mkdirRecursive(path, chunks);
    }
    
	private registerService(dir:string, info) : Promise<boolean>
	{
        return new Promise((resolve, reject) => {
            if (this.options.clone) {
                resolve(true);
                return;
            }

            this.vorpal.log("*** Registering project in vulcain...");
            var request = rest.post(this.options.server + "/api/Service/commitService")
                .header('Accept', 'application/json')
                .header('Authorization', "ApiKey " + this.options.token)
                .type("json")
                .send({ data: this.requestData });

            request.end(response => {
                if (response.ok) {
                    var info = response.body;
                    if (info.status === "Error") {
                        reject(info.error.message);
                        return;
                    }
                    this.vorpal.log("*** Project registered with success.")
                    this.doNotRemoveFolder = true;
                    resolve(true);
                    return;
                }

                reject(util.format("Unable to register project - %j", ((response.body && response.body.error) || response.body || response.error)));
            });
        });
	}
	
	private deleteFolderRecursive(path, first?:boolean) 
	{
  		if( path && fs.existsSync(path) ) 
		{
			if(first) {
            	this.vorpal.log("** Removing project directory...");
            }
            
			fs.readdirSync(path).forEach((file,index) =>
			{
				var curPath = path + "/" + file;
				if(fs.lstatSync(curPath).isDirectory()) 
				{ // recurse
					this.deleteFolderRecursive(curPath);
				} else 
				{ // delete file
					fs.unlinkSync(curPath);
				}
			});
			fs.rmdirSync(path);
		}
	}
	
	private createNewGitRepository(local:string) : Promise<string> 
	{
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
                    this.vorpal.log("*** Error when updating source files - " + e);
                }
                resolve(local);
            });
        });
    }
    
    private gitRemoveOrigin() {
        return new Promise(async (resolve, reject) => {
            let local = this.engine.meta.baseDir;
            let repo = git(local); 
            this.vorpal.log("*** Remove origin");
            repo.remote_remove("origin", err => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(local);
            });
        });
    }
    
    private gitCommit( newRepositoryUrl:string )
    {
        return new Promise(async (resolve, reject) => {
            let local = this.engine.meta.baseDir;

            try {
                await this.engine.execScriptsAsync();
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
	
	clone(templateUrl:string, folder:string) : Promise<string> 
	{
        return new Promise((resolve, reject) => {

            if (this.action === Action.AddExistingProject) {
                this.vorpal.log("*** Adding project from folder " + folder);
                this.doNotRemoveFolder = true;
                this.engine.setBaseDir(folder);
                resolve(folder);
                return;
            }

            let local = Path.join(this.options.folder, this.engine.meta.project.name);
            if (fs.existsSync(local)) {
                this.doNotRemoveFolder = true;
                reject("destination path " + local + " already exists");
                return;
            }
            this.engine.setBaseDir(local);
            this.vorpal.log("*** Cloning repository into " + local + "...");
            copy.copy(local);
            
            git.clone(
                templateUrl,
                local,
                1,
                (err, repo) => {
                    if (err) {
                        if (err.message) {
                            var pos = (<string>err.message).indexOf("fatal");
                            if (pos > 0)
                                err = err.message.substr(pos + 6);
                        }
                        reject(err);
                    }
                    else
                        resolve(local);
                }
            );
        });
	}
}