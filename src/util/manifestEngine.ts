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
const glob = require('glob')
const ejs = require('ejs')
const os = require('os')
import * as fs from 'fs'
import * as path from 'path'
const child_process = require("child_process");

export class Engine {
	private manifestPath:string;
    private manifest: any;
    
	constructor(private vorpal, public meta?:any) {
        this.manifest = meta;
        this.meta = meta || {project:{}};
    }

    setBaseDir(folder: string) {
        this.meta.baseDir = folder;
        this.manifestPath = path.join(this.meta.baseDir, "template.manifest");
    }

    updateMeta(info) {
        this.meta.teamName = info.team;
        this.meta.project.namespace = info.ns;
        this.meta.project.safeName = info.safeName;
        this.meta.project.name = info.name;
        this.meta.project.fullName = info.ns + "." + info.name;
        this.meta.hub = info.hub;
    }
    
    readManifest() 
    {
        if(!this.manifest) {
            if( fs.existsSync(this.manifestPath)) 
            {
                try 
                {  
                    this.manifest = JSON.parse(<string><any>fs.readFileSync(this.manifestPath, "utf8"));
                }		
                catch(e) 
                {
                    this.manifest = {};
                    throw new Error("*** Error when reading template.manifest " + e);
                }
            }
        }
        return this.manifest;
    }
    
	transform() 
	{
		// find manifest
        let manifest = this.readManifest();
        if( manifest && manifest.transform && manifest.transform.replace) 
        {
            manifest.transform.replace.forEach(rule => 
            {
                this.replace(rule.filter, rule.context);
            });
        }
        if( manifest && manifest.transform && manifest.transform.rename) 
        {
            manifest.transform.rename.forEach(item => 
            {
                this.rename(item.filter, new RegExp(item.pattern, "gi"), item.target);
            });
        }
        if( manifest && manifest.transform && manifest.transform.attributes && os.platform() !== "win32") 
        {
            manifest.transform.attributes.forEach(item =>
            {
                this.chmod(item.filter, item.mode);
            });
        }
    }
    
    displayMessage(step:string) 
    {
        let manifest = this.readManifest();
        if( manifest && manifest.messages) 
        {
            let messages:Array<string> =  manifest.messages[step];
            if(messages) {
                console.log("");
                messages.forEach( (msg: string) => console.log("INFO : " + msg));
                console.log("");
            }
        }        
	}
    
    async execScriptsAsync(step?:string) 
    {
        step = step || "install";
        let manifest = this.readManifest();
        if( manifest && manifest.scripts) 
        {
            let platform = os.platform() === "win32" ? "win32" : "*nix";             
            let scripts =  manifest.scripts[platform] || manifest.scripts.all;
            let commands: Array<string> = scripts && scripts[step];
            if (commands) {
                for (let cmd of commands) {
                    if (cmd)
                        await this.execAsync(cmd);    
                }
            }
           // commands && commands.forEach( (cmd: string) => this.exec(cmd));
        }        
	}
	
    private execAsync(command: string) {
        return new Promise((resolve, reject) => {
            console.log("*** Running : " + command);
            let ps = child_process.exec(command, { cwd: this.meta.baseDir });
            ps.stdout.on("data", data => this.vorpal.log(data));
            ps.stderr.on("data", data => this.vorpal.log(data));
            ps.on('exit', code => resolve(code));
            this.vorpal.log();
        });
    }
    	
	private resolveProperty(name:string) 
	{
		name = name.substr(1, name.length-2); // remove {..}
		
		var parts = name.split(".");
		var root = this.meta;
		parts.forEach(p=> 
		{
			if(root) {
				root = root[p];
			}
		})
		return root;
	}
	
	private rename(filter:string, pattern:RegExp, target:string) 
	{
		// Prepare target
		var rg = /{([^}]*)}/g;
		var properties = target.match(rg);
		// Replace substitution variables with theirs values 
		properties.forEach( p=> {
			target = target.replace( p, this.resolveProperty(p));
		});
		
		// Find file to rename
		var files = glob.sync(filter, {cwd:this.meta.baseDir});
		for(var n in files ) 
		{
			var file = path.join(this.meta.baseDir, files[n]);
			var fileName = path.basename(file);
			
			fileName = fileName.replace(pattern, target);			
			fs.rename(file, path.join(this.meta.baseDir, fileName));
		}
	}
	
	private chmod(filter:string, mode:string) 
	{		
		var files = glob.sync(filter, {cwd:this.meta.baseDir});
		for(var n in files ) 
		{
			var file = path.join(this.meta.baseDir, files[n]);
			fs.chmodSync(file, mode)
		}
	}
    
	private replace(filter:string, data) 
	{
		this.meta.data = data;
		
		var files = glob.sync(filter, {cwd:this.meta.baseDir});
		for(var n in files ) 
		{
			var file = path.join(this.meta.baseDir, files[n]);
			var txt = fs.readFileSync(file, "utf8");
			
			this.meta.fileName = file;
			var txt2 = ejs.render(txt, this.meta);
			
			fs.writeFileSync(file, txt2);
		}
	}
}