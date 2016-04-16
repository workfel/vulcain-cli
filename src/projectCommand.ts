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

/// <reference path="../typings/q/q.d.ts"/>
import * as fs from 'fs'
import * as Path from 'path'
import * as e from './engine'
import Q = require('q')
var exec = require('child_process').exec;
var rest = require('unirest')
var git = require('gift')

export class ProjectCommand 
{
	private meta;
	private requestData;
	private engine:e.Engine;
    private addExistingProject: boolean;
    private doNotRemoveFolder = false;
    
	constructor(private options, addExistingProject?:boolean) 
	{		
		this.meta = {project:{}};
		this.meta.user = this.options.user && (<string>this.options.user).split(":")[0];
		this.requestData =  
        {
            name:this.options.project, 
            template:this.options.template, 
            description:this.options.description || "Created by " + this.options.userName + " at " + new Date().toUTCString() + "(UTC)",
            env:this.options.env,
            addExistingProject:!!addExistingProject,
            team: this.options.team
        };
        this.addExistingProject = this.requestData.addExistingProject;
	}
	
	execute() : Q.Promise<boolean> 
	{
        var defer = Q.defer<boolean>();
        
     /*   this.commandExists('git', (err, exists) => 
        {
            if(!exists) {
                console.log();     
                console.log("Command aborted. Git is not found in the current context. Install it before retry.");
                defer.reject("Command aborted.")
                return;
            }*/
            //var x = git(this.options.baseDir);
            var self = this;
            
            console.log();            
            console.log("Creating new project : " + this.options.project);

            console.log();
            console.log("*** Get project informations from vulcain at " + this.options.server + "...");
            
            var request = rest.post(this.options.server + "/api/v1/register")
                            .header('Accept', 'application/json')
                            .header('Authorization', "ApiKey " + this.options.token )
                            .type("json")
                            .send(this.requestData);
            
            // A partir du user (ou du team en test)
            // Input : (user with authentication)
            //  - team
            //  - nom projet
            //  - template
            //  - description
            // Output:
            //  - team name
            //  - team namespace
            //  - safe project name
            //  - template url
            //  - project url
            //  - docker repository name
            request.end( response => 
                {
                    if( response.ok) 
                    {
                        var info = response.body;
                        self.meta.teamName = info.team;
                        self.meta.project.namespace = info.ns;
                        self.meta.project.safeName = info.safeName;
                        self.meta.project.name = info.name;
                        self.meta.project.fullName = info.ns + "." + info.name;
                        self.meta.hub = info.hub;
                                            
                        if(!self.options.folder) 
                        {
                            let env = process.env["VULCAIN_PROJECT"];
                            if(!env) {
                                self.options.folder = process.cwd();
                            }
                            else {
                                env = env.replace(/["']/g, "").trim();
                                self.options.folder = Path.join(env, info.team);
                            }
                        }
                        else if( self.options.folder === ".") {
                            self.options.folder = process.cwd();
                        } 
                             
                        try {
                            self.mkdir(self.options.folder);
                        }
                        catch(err) {
                            console.log();
                            console.log("*** Cannot create target folder : " + err );
                            defer.resolve(false);
                            return;
                        }
                        console.log();
                        console.log("*** Creating project " + self.meta.project.fullName);
                        
                        this.doNotRemoveFolder = false;
                        self.clone(info.template, self.options.folder, self.requestData.addExistingProject)
                            .then(dir=> self.initRepository(dir))
                            .then(dir=> self.commit( dir, info ))
                            .then(dir=> self.gitCommit(info.projectUrl))
                            .then(_ => {
                                 console.log("Project created in " + this.meta.baseDir);
                                 defer.resolve(true);
                            })
                            .catch(e => 
                            {
                                console.log("*** " + e);
                                try {
                                    if(!this.addExistingProject && !this.doNotRemoveFolder)
                                        self.deleteFolderRecursive(self.meta.baseDir, true);                            
                                }
                                catch(ex) {
                                    console.log("*** " + ex);
                                }
                                defer.reject(null);
                            });
                        return;
                    }
                    
                    console.log();
                    console.log("*** Cannot create project with the specified arguments. " + (response.body && response.body.message || response.body || response.statusMessage || response.error ));
                    if( response.body && response.body.errors) {
                        response.body.errors.forEach(err => {
                            console.log(err.message); 
                        });
                        console.log("");
                    }
                    defer.resolve(false);
                }
            );
      //  });
        
		return defer.promise;
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
        
        let path = Path.join(base, chunk);
        if(!fs.existsSync(path)) {
            let err = fs.mkdirSync(path);
            if(err)
                throw err;
        }
        this.mkdirRecursive(path, chunks);
    }
    
	private commit(dir:string, info) : Q.Promise<boolean>
	{
		var defer = Q.defer<boolean>();	
		if( this.options.clone) {
			defer.resolve(true);
			return;
		}
		
        console.log();
		console.log("*** Registering project in vulcain...");
		var request = rest.post(this.options.server + "/api/v1/register/commit")
					.header('Accept', 'application/json')
					.header('Authorization', "ApiKey " + this.options.token )
					.type("json")
					.send(this.requestData);

		request.end( response => 
		{
			if(response.ok) 
			{
                console.log();
                console.log("*** Project registered with success.")
                this.doNotRemoveFolder = true;
                defer.resolve(true);
				return;
			}
			defer.reject("Unable to register project - " + ((response.body && response.body.message) || response.body || response.statusMessage));
		});
		return defer.promise;
	}
	
	private deleteFolderRecursive(path, first=false) 
	{
  		if( path && fs.existsSync(path) ) 
		{
			if(first) {
	            console.log();		
            	console.log("** Removing project directory...");
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
	
	private initRepository(local:string) : Q.Promise<string> 
	{
		var defer = Q.defer<string>();		 
		this.meta.baseDir = local;
	    this.engine = new e.Engine(this.meta);
		this.deleteFolderRecursive( Path.join(local, ".git"), false);
				
		git.init(local, (err,repo) => 
		{	
			if(err) {
				defer.reject(err);
				return;
			}							

            console.log();            
            console.log("*** Updating source files...");
            try 
            {					
                this.engine.transform();
            }
            catch(e) { 
                defer.reject(e) 
                return;
            }				
            defer.resolve(local);
        });
        return defer.promise;
    }
    
    private gitCommit( newRepositoryUrl:string )
    {
        let defer = Q.defer<string>();	
        let local = this.meta.baseDir;
        
        try {
            this.engine.execScripts();
        }
        catch(err) {
            // Not critical
            console.log("*** Error when running scripts : " + err);
        }
        
        let repo = git(local);
        console.log();                
        console.log("*** Committing changes...");
        repo.add(".", err => 
        {
            if(err) {
                defer.reject(err);
                return;
            }	
            
            repo.commit("Initial commit", err => 
            {		
                if(err) {
                    defer.reject(err);
                    return;
                }
                if( this.options.clone) {
                        defer.resolve(local);
                        return;
                }

                console.log();                   
                console.log("*** Switching origin to " + newRepositoryUrl);
                repo.remote_add("origin", newRepositoryUrl, err => 
                {		
                    if(err) {
                        defer.reject(err);
                        return;
                    }	
                    /*repo.remote_push("origin", "master", err=>
                    {
                        if(err) {
                            defer.reject(err);
                            return;
                        }	
                        defer.resolve(local);
                    });*/
                    defer.resolve(local);
                });
            });
        });
        
		return defer.promise;
	}
	
	clone(templateUrl:string, folder:string, addExistingProject:boolean) : Q.Promise<string> 
	{
		var defer = Q.defer<string>();
		
        if(addExistingProject) {
            console.log();
            console.log("*** Adding project from folder " + folder);
            defer.resolve(folder);
            return defer.promise;    
        }
        
		let local = Path.join(this.options.folder, this.meta.project.name);
        console.log();
		console.log("*** Cloning repository into " + local + "...");
        git.clone( 
            "--depth 1 " + templateUrl,
            local, 
 /*           {
                fetchOpts: {
                    callbacks: {
                       // credentials: function() {
                       //     return git.Cred.userpassPlaintextNew(GITHUB_TOKEN, "x-oauth-basic");
                       // },
                        certificateCheck: function() {
                            // github will fail cert check on some OSX machines
                            // this overrides that check
                            return 1;
                        }
                    }
                }
            },*/
            (err,repo) =>
            {
                if(err) 
                {
                    if( err.message) {
                        var pos = (<string>err.message).indexOf("fatal");
                        if( pos > 0)
                            err = err.message.substr(pos+6);
                    }
                    defer.reject(err);
                }
                else
                    defer.resolve(local);
            }
        );		
        
		return defer.promise;
	}
    
    commandExists(commandName, callback) 
    {
        var child = exec('which ' + commandName);
        var gotData = false;
        
        child.stdout.on('data', function() {
            gotData = true;
        });

        child.on('close', function() {
            callback(null, gotData);
        });
    }
}