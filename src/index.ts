#!/usr/bin/env node
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
import {ProjectCreateCommand} from './commands/projectCreateCommand'
import {ProjectCloneCommand} from './commands/projectCloneCommand'
import {ProjectAddCommand} from './commands/projectAddCommand'
import {ProjectTestCommand} from './commands/projectTestCommand'
import {ConfigCommand} from './commands/configCommand'
import {InitCommand} from './commands/initCommand'
import {TemplateAddCommand} from './commands/templateAddCommand'
var vorpal = require('vorpal')();

vorpal
    .delimiter("vulcain > ");

console.log()
console.log("Vulcain command - Version: 1.0.13");
console.log("=================================")
console.log();
console.log("Commands : ");

//new TemplateAddCommand(vorpal);
new ProjectCreateCommand(vorpal);
new ProjectCloneCommand(vorpal);
new ProjectAddCommand(vorpal);
new ProjectTestCommand(vorpal);
new InitCommand(vorpal);
new ConfigCommand(vorpal);
console.log();

vorpal.show();