"use strict";
const abstractCommand_1 = require('./abstractCommand');
const projectCreateExecutor_1 = require('../util/projectCreateExecutor');
var Promise = require('promise');
class ProjectTestCommand extends abstractCommand_1.AbstractCommand {
    constructor(vorpal) {
        super(vorpal);
        let desc = "test    : Create locally a new project from template. (Don't register it in vulcain))";
        console.log("  - " + desc);
        let self = this;
        vorpal.command('test <name>', desc)
            .validate(args => {
            if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\\-]*[a-z0-9])\\.)*([a-z0-9]|[a-z0-9][a-z0-9\\-]*[a-z0-9])$/.test(args.name))
                return "Invalid character for project name. Use only lowercase, number, '.' or '-'";
        })
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
            var executor = new projectCreateExecutor_1.CreateProjectExecutor(this.vorpal, options, projectCreateExecutor_1.Action.DontRegister);
            executor.executeAsync().then(done);
            return;
        }
        done();
    }
}
exports.ProjectTestCommand = ProjectTestCommand;

//# sourceMappingURL=projectTestCommand.js.map
