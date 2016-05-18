import {AbstractCommand} from './abstractCommand'
import {CreateProjectExecutor, Action} from '../util/projectCreateExecutor'
var Promise = require('promise');

export class TemplateAddCommand extends AbstractCommand {

    constructor(vorpal) {
        super(vorpal);

        let desc = "template add    : Add local project to vulcain.";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('template clone <name>', desc)
            .validate(args => {
                if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\\-]*[a-z0-9])\\.)*([a-z0-9]|[a-z0-9][a-z0-9\\-]*[a-z0-9])$/.test(args.name))
                    return "Invalid character for project name. Use only lowercase, number, '.' or '-'"
            })
            .option("--desc <description>", "Project description")
            .option("--folder, -f <folder>", "Project folder")
            .action(function (args, cb) {
                self.exec(this, args, cb);
            });
    }

    private templateAutoCompletion(input, callback) {
        let request = this.createRequest(["templates"], { startsWith: input });
        if (!request) return [];
        request.end((response) => {
            var templates = (response.ok && response.body && response.body.data) || [];
            callback(templates.map(t => t.name));
        });
    }
    
    protected checkArguments(args, errors) {
    }

    private exec(vorpal, args, done) {
        let options = this.prepareOptions(args.options)
        if (options) {
            options.project = args.name;
            this.vorpal.log();
            this.vorpal.log("Adding template : " + options.project);
            try {
                var executor = new CreateProjectExecutor(this.vorpal, options, Action.AddExistingProject);
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