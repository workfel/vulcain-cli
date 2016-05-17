"use strict";
const abstractCommand_1 = require('./abstractCommand');
const projectCreateExecutor_1 = require('../util/projectCreateExecutor');
var Promise = require('promise');
class ProjectCloneCommand extends abstractCommand_1.AbstractCommand {
    constructor(vorpal) {
        super(vorpal);
        let desc = "clone   : Clone an existing vulcain project";
        console.log("  - " + desc);
        let self = this;
        vorpal.command('clone <name>', desc)
            .autocomplete({ data: this.serviceAutoCompletion.bind(this) })
            .validate(args => {
            if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\\-]*[a-z0-9])\\.)*([a-z0-9]|[a-z0-9][a-z0-9\\-]*[a-z0-9])$/.test(args.name))
                return "Invalid character for project name. Use only lowercase, number, '.' or '-'";
        })
            .action(function (args, cb) {
            self.exec(this, args, cb);
        });
    }
    serviceAutoCompletion(input, callback) {
        let options = this.readOptions();
        let request = this.createRequest(["services"], { team: options.team, startsWith: input });
        if (!request)
            return [];
        request.end((response) => {
            var templates = (response.ok && response.body && response.body.data) || [];
            callback(templates.map(t => t.name));
        });
    }
    checkArguments(args, errors) {
        if (!args.team) {
            errors.push("No team are setting in current context. Use config --team option.");
        }
    }
    exec(vorpal, args, done) {
        let options = this.prepareOptions(args.options);
        if (options) {
            options.project = args.name;
            this.vorpal.log();
            this.vorpal.log("Cloning project : " + options.project);
            return vorpal.prompt([
                { type: "input", name: "userName", message: "Enter a valid user name to connect to version control: " },
                { type: "password", name: "password", message: "Enter password: " }
            ]).then(answers => {
                options.userName = answers.userName;
                options.password = answers.password;
                var executor = new projectCreateExecutor_1.CreateProjectExecutor(this.vorpal, options, projectCreateExecutor_1.Action.Clone);
                executor.executeAsync().then(done);
            });
        }
        else
            done();
    }
}
exports.ProjectCloneCommand = ProjectCloneCommand;

//# sourceMappingURL=projectCloneCommand.js.map
