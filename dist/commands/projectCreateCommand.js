"use strict";
const abstractCommand_1 = require('./abstractCommand');
const projectCreateExecutor_1 = require('../util/projectCreateExecutor');
var Promise = require('promise');
class ProjectCreateCommand extends abstractCommand_1.AbstractCommand {
    constructor(vorpal) {
        super(vorpal);
        let desc = "create  : Create a new project from template.";
        console.log("  - " + desc);
        let self = this;
        vorpal.command('create <name>', desc)
            .validate(args => {
            if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\\-]*[a-z0-9])\\.)*([a-z0-9]|[a-z0-9][a-z0-9\\-]*[a-z0-9])$/.test(args.name))
                return "Invalid character for project name. Use only lowercase, number, '.' or '-'";
        })
            .option("--desc <description>", "Project description")
            .option("-p, --package", "Create as a package (library)")
            .option("-t, --template <template>", "Template name used to initialize project", this.templateAutoCompletion.bind(this))
            .action(function (args, cb) {
            self.exec(this, args, cb);
        });
    }
    templateAutoCompletion(input, callback) {
        let request = this.createRequest(["templates"], { startsWith: input });
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
        if (!args.template) {
            errors.push("You must provide a template. Use --template (or -t) option.");
        }
    }
    exec(vorpal, args, done) {
        let options = this.prepareOptions(args.options);
        if (options) {
            options.project = args.name;
            this.vorpal.log();
            this.vorpal.log("Creating new project : " + options.project);
            var executor = new projectCreateExecutor_1.CreateProjectExecutor(this.vorpal, options, projectCreateExecutor_1.Action.Create);
            executor.executeAsync().then(done);
            return;
        }
        done();
    }
}
exports.ProjectCreateCommand = ProjectCreateCommand;

//# sourceMappingURL=projectCreateCommand.js.map