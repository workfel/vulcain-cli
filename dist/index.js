#!/usr/bin/env node
"use strict";
const projectCreateCommand_1 = require('./commands/projectCreateCommand');
const projectCloneCommand_1 = require('./commands/projectCloneCommand');
const projectAddCommand_1 = require('./commands/projectAddCommand');
const projectTestCommand_1 = require('./commands/projectTestCommand');
const configCommand_1 = require('./commands/configCommand');
const initCommand_1 = require('./commands/initCommand');
var vorpal = require('vorpal')();
vorpal
    .delimiter("vulcain > ");
console.log();
console.log("Vulcain command - Version: 1.0.9");
console.log("================================");
console.log();
console.log("Commands : ");
new projectCreateCommand_1.ProjectCreateCommand(vorpal);
new projectCloneCommand_1.ProjectCloneCommand(vorpal);
new projectAddCommand_1.ProjectAddCommand(vorpal);
new projectTestCommand_1.ProjectTestCommand(vorpal);
new initCommand_1.InitCommand(vorpal);
new configCommand_1.ConfigCommand(vorpal);
console.log();
vorpal.show();

//# sourceMappingURL=index.js.map
