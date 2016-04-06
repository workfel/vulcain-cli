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
var Table = require('easy-table')

export class TemplatesCommand {

	constructor(private options) {		
	}
	
	execute() : Q.Promise<boolean> 
	{
		var defer = Q.defer<boolean>();
        console.log();
		console.log("Getting available templates");
		console.log("");
		
		rest.get(this.options.server + "/api/v1/teams/" + this.options.team + "/templates")
			.header('Accept', 'application/json')
			.header('Authorization', "ApiKey " + this.options.token )
			.end( response => 
			{
				if( response.ok) 
				{
					var templates = response.body;
					var cx = 0;
					var table = new Table();

					for(var t of templates) {
						cx++;
						table.cell('Name', t.name);
						table.cell('Description', t.description);
						table.newRow();
					}
					console.log(table.toString());
					console.log(cx + " templates found.");
				}
				else 
				{
					console.log("Server error : " + ((( response.body && response.body.message) || response.body) || response.statusMessage || response.error))
				}
				defer.resolve(response.ok);
			});
			
		return defer.promise;
	}
}