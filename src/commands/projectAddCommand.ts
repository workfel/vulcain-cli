import {AbstractCommand} from './abstractCommand'
import {CreateProjectExecutor, Action} from '../util/projectCreateExecutor'
var Promise = require('promise');

export class ProjectAddCommand extends AbstractCommand {
    constructor(vorpal) {
        super(vorpal);

        let desc = "add     : Add local project to vulcain.";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('add <name>', desc)
            .validate(args => {
                if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\\-]*[a-z0-9])\\.)*([a-z0-9]|[a-z0-9][a-z0-9\\-]*[a-z0-9])$/.test(args.name))
                    return "Invalid character for project name. Use only lowercase, number, '.' or '-'"
            })
            .option("--desc <description>", "Project description")
            .option("-p, --package", "Create as a package (library)")
            .action(function (args, cb) {
                self.exec(this, args, cb);
            });
    }

    protected checkArguments(args, errors) {
        if (!args.team) {
            errors.push("No team are setting in current context. Use config --team option.")
        }
    }
    
    private exec(vorpal, args, done) {
        let options = this.prepareOptions(args.options)
        if (options) {
            options.project = args.name;
            this.vorpal.log();
            this.vorpal.log("Adding project : " + options.project);

            var executor = new CreateProjectExecutor(this.vorpal, options, Action.AddExistingProject);
            executor.executeAsync().then(done);
            return;
        }
        done();
    }
}