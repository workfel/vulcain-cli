import {AbstractCommand} from './abstractCommand'
import {CreateProjectExecutor, Action} from '../util/projectCreateExecutor'
var Promise = require('promise');

export class ProjectCreateCommand extends AbstractCommand {
    constructor(vorpal) {
        super(vorpal);

        let desc = "create  : Create a new project from template.";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('create <name>', desc)
            .validate(args => {
                if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$/.test(args.name))
                    return "Invalid character for project name. Use only lowercase, number, '.' or '-'"
            })
            .option("--desc <description>", "Project description")
            .option("--team <team>", "Team name", this.teamAutoCompletion.bind(this))            
            .option("--folder, -f <folder>", "Project folder", this.fileAutoComplete)
            .option("-p, --package", "Create as a package (library)")
            .option("-t, --template <template>", "Template name used to initialize project", this.templateAutoCompletion.bind(this))
            .action(function (args, cb) {
                self.exec(this, args, cb);
            });
    }

    protected checkArguments(args, errors) {
        if (!args.team) {
            errors.push("No team are setting in current context.")
        }
        if (!args.template) {
            errors.push("You must provide a template. Use --template (or -t) option.")
        }
    }

    private exec(vorpal, args, done) {
        let options = this.prepareOptions(args.options)
        if (options) {
            options.project = args.name;
            this.vorpal.log();
            this.vorpal.log("Creating new project : " + options.project);
            try {
                var executor = new CreateProjectExecutor(this.vorpal, options, Action.Create);
                executor.executeAsync().then(done);
                return;
            }
            catch (e) {
                vorpal.log(e);
            }
        }
        done();
    }
}