import {AbstractCommand} from './abstractCommand'
import {CreateProjectExecutor, Action} from '../util/projectCreateExecutor'
var Promise = require('promise');

export class ProjectTestCommand extends AbstractCommand {
    constructor(vorpal) {
        super(vorpal);

        let desc = "test    : Create locally a new project from template. (Don't register it in vulcain))";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('test <name>', desc)
            .validate(args => {
                if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$/.test(args.name))
                    return "Invalid character for project name. Use only lowercase, number, '.' or '-'"
            })
            .option("-t, --template <template>", "Template name used to initialize project", this.templateAutoCompletion.bind(this))
            .option("--folder, -f <folder>", "Project folder", this.fileAutoComplete)
            .action(function (args, cb) {
                self.exec(this, args, cb);
            });
    }

    protected checkArguments(args, errors) {
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
                var executor = new CreateProjectExecutor(this.vorpal, options, Action.DontRegister);
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