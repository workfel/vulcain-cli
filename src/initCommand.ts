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
import Q = require('q')
var rest = require('unirest')
import * as e from './engine'

export class InitCommand {

	constructor(private options) {		
	}
	
	execute() : Q.Promise<boolean> 
	{
		var defer = Q.defer<boolean>();
        console.log();
		console.log("Initialize developpement context for team " + this.options.team);
        console.log("Get initialization script from " + this.options.server);
		console.log("");
		
		rest.get(this.options.server + "/api/v1/teams/" + this.options.team + "/context")
			.header('Accept', 'application/json')
			.header('Authorization', "ApiKey " + this.options.token )
			.end( response => 
			{
				if( response.ok) 
				{
					let manifest = response.body;
                    if(!manifest ) {
                        console.log("Nothing to do.");
                    }
                    else {
                        if(manifest.preCommands) {
                            let commands = manifest.preCommands.split('\n').replace(/[\r\n]/g, "").trim();
                            console.log("Running pre-commands : ");
                            let engine = new e.Engine({scripts: {all: {"$context" : commands}}});
                            try {
                                engine.execScripts("$context");                        
                            }
                            catch(e) {
                                console.log("Error : " + e);
                            }
                        }
                        if(manifest.node) {
                            console.log("Running script : ");
                            let code = "exports.init = function() {" + manifest.node + "}";
                            try {
                                this.execFromString(code);
                            }
                            catch(e) {
                                console.log("Error in javascript code : " + e);
                                defer.reject(e);
                                return;
                            }
                        }
                        if(manifest.postCommands) {
                            let commands = manifest.postCommands.split('\n').replace(/[\r\n]/g, "").trim();
                            console.log("Running post-commands : ");
                            let engine = new e.Engine({scripts: {all: {"$context" : commands}}});
                            try {
                                engine.execScripts("$context");                        
                            }
                            catch(e) {
                                console.log("Error : " + e);
                            }
                        }
                    }
				}
				else 
				{
					console.log("Server error : " + ((( response.body && response.body.message) || response.body) || response.statusMessage || response.error))
				}
				defer.resolve(response.ok);
			});
			
		return defer.promise;
	}
    
    execFromString(code) {
        let m = new (<any>module).constructor();
        m.paths = (<any>module).paths;
        m._compile(code);
        let exports = m.exports;
        exports.init();
    }
}