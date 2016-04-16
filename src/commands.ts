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

/// <reference path="../typings/node/node.d.ts"/>
/// <reference path="../typings/q/q.d.ts"/>
import {Parser} from './flags'
import {ConfigOptions, CreateOptions, ProjectOptions, MainOptions, CloneOptions} from './options'
import {ProjectCommand} from './projectCommand'
import {CloneCommand} from './cloneCommand'
import {TemplatesCommand} from './templatesCommand'
import * as fs from 'fs'
import * as Q from 'q'
import * as path from 'path'

interface ICommand
{
    execute(): Q.Promise<boolean>;    
}

var homedir = (process.platform === 'win32') ? process.env.APPDATA : process.env.HOME;
var configDir = path.join(homedir, ".vulcain");
var configFilePath = path.join(configDir, "config.json");
        
export class Commands extends Parser {
  
    private readOptions() {

        var config:any = {};
        if( fs.existsSync(configFilePath)) 
        {
            try {
                config = JSON.parse( fs.readFileSync(configFilePath, {encoding:"utf8"}));
            }
            catch (e) {}
        }     
        return config;  
    }
    
    private prepareOptions(args) 
    {
        let config = this.readOptions();
        
        args.baseDir = process.cwd();

        // Merge config
        if( !args.server) {
            args.server = config.server;
        }
        if( !args.folder) {
            args.folder = config.folder;
        }        
        if( !args.env) {
            args.env = config.env;
        }
        if( !args.template) {
            args.template = config.template;
        }
        if( !args.team) {
            args.team = config.team;
        }
        if( !args.token && config.token) {
            args.token = config.token;
        }
 
        return args;   
    }
    
    config(args:ConfigOptions) 
    {
        var config = this.readOptions();
        var setting=false;
        
        if( args.server) {
            config.server = args.server;
            setting=true;
        }
        
        if( args.token) {
            config.token = args.token;
            setting=true;
        }

        if( args.template) {
            config.template = args.template;
            setting=true;
        }
        
        if( args.folder) {
            config.folder = args.folder;
            setting=true;
        }
        
        if( args.env) {
            config.env = args.env;
            setting=true;
        }

        if( args.team) {
            config.team = args.team;
            setting=true;
        }
        
        if(!fs.existsSync(homedir))
            fs.mkdirSync(homedir);
        if(!fs.existsSync(configDir))
            fs.mkdirSync(configDir);

        if(setting) {
            console.log("Settings saved.");        
            fs.writeFileSync(configFilePath, JSON.stringify(config), {encoding:"utf8"});
        }

        console.log("Current settings: ");
        if( config.server) {
            console.log("- server address : " + config.server);
        }
        
        if( config.template) {
            console.log("- template       : " + config.template);
        }
        
        if( config.folder) {
            console.log("- folder         : " + config.folder);
        }        
        
        if( config.env) {
            console.log("- env            : " + config.env);
        }

        if( config.team) {
            console.log("- team           : " + config.team);
        } 

        console.log("Done.");       
    }  
    
    private executeCommand(command:ICommand, args) 
    {
        if(command) 
        {
            console.log("");
            console.log("Executing command with the following arguments :");
            console.log("");
            if(args.server)
                console.log("  - server   : %s", args.server);
            if(args.env)
                console.log("  - env      : %s", args.env);
            if(args.team)
                console.log("  - team     : %s", args.team);
            
            Q.when(command.execute())
            .then(r =>
            {
                console.log();
                console.log("Done.");
                process.exit(r ? 0 : 1);
            })
            .catch(e => 
            {
                if(e)
                    console.error(e);
                process.exit(1);
            });
        }
    }
    
    private checkArgument(args, name) 
    {
        if( args[name]) {
            // normalize
            if( name === "server" && (<string>args.server).toLowerCase().substr(0,4) !== "http")
            {
                args.server = "http://" + args.server;
            }
            return true;
        }
        console.log("Argument " + name + " is required.");
        return false;
    }
    
    private prepareProjectOptions(args) 
    {
        this.prepareOptions(args);
    
        let ok = true;
        ["server", "team", "token"].forEach( a=> { ok = ok && this.checkArgument(args, a);});
        if(ok)
        {
            let re = /^[a-zA-Z][a-zA-Z0-9_\.-]*[a-zA-Z0-9]$/
            if( !args.project.match(re)) 
            {
                console.log("Invalid project name format must match the [a-zA-Z][a-zA-Z0-9_\.-]*[a-zA-Z0-9] pattern.");
                process.exit(1);
            }
        }
        return ok;   
    }
  
    cloneProject(args:CloneOptions) 
    {
        if(this.prepareProjectOptions(args) )
        {
            console.log("Cloning project ");
            let command = new CloneCommand(args);  
            this.executeCommand(command, args);
        }      
    }
    
    testProject(args:CreateOptions) 
    {
        if(this.prepareProjectOptions(args))
        {
            args.clone = true;
            console.log("Create a project from template");
            let command = new ProjectCommand(args);  
            this.executeCommand(command, args);
        }      
    }
      
    createProject(args:CreateOptions) 
    {
        if(this.prepareProjectOptions(args) )
        {
            if( args.template) {
                console.log("Creating project from template :")
                console.log("  - template : %s", args.template);
            }
            else {
                console.log("You must provide a template to create a new project.");
                process.exit(2);
            }
            
            let command = new ProjectCommand(args);  
            this.executeCommand(command, args);
        }      
    }
    
    addProject(args:ProjectOptions)
    {
        if(this.prepareProjectOptions(args)  )
        {
            if( args.folder) 
            {
                console.log("Adding an existing project from folder :")
                console.log("  - folder   : %s", args.folder);
            }
            else {
                console.log("You must provide a folder to register a project.");
                process.exit(2);
            }
            
            let command = new ProjectCommand(args, true);  
            this.executeCommand(command, args);
        }      
    }
    
    listTemplates() {
        let args = this.prepareOptions({});
        
        var ok = true;
        ["server", "token"].forEach( a=> { ok = ok && this.checkArgument(args, a);});
        if(ok) {
            let command = new TemplatesCommand(args);   
            this.executeCommand(command, args);
        }
    }
}