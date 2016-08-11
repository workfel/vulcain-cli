import {AbstractCommand} from './abstractCommand'
import {CreateProjectExecutor, Action} from '../util/projectCreateExecutor'
var Promise = require('promise');

export class ProjectCloneCommand extends AbstractCommand {
    constructor(vorpal) {
        super(vorpal);
        let desc = "clone   : Clone an existing vulcain project";
        console.log("  - " + desc);

        let self = this;
        vorpal.command('clone <name>', desc)
            .autocomplete({data: this.serviceAutoCompletion.bind(this)})
            .validate(args => {
                if (!/^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$/.test(args.name))
                    return "Invalid character for project name. Use only lowercase, number, '.' or '-'"
            })
            .option("--folder, -f <folder>", "Project folder", this.fileAutoComplete)
            .action(function (args, cb) {
                self.exec(this, args, cb);
            });
    }

    private serviceAutoCompletion(input, callback) {
        let options = this.readOptions();
        let request = this.createRequest(["services"], { team: options.team, startsWith: input });
        if (!request) return [];
        request.end((response) => {
            var templates = (response.ok && response.body && response.body.data) || [];
            callback(templates.map(t => t.name));
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
            this.vorpal.log("Cloning project : " + options.project);
            return vorpal.prompt([
                { type: "input", name: "userName", message: "Enter a valid user name to connect to your version control server (optional) : " },
                { type: "password", name:"password", message:"Enter password : "}
            ]).then(answers => {
                options.userName = answers.userName;
                options.password = answers.password;
                try {
                    var executor = new CreateProjectExecutor(this.vorpal, options, Action.Clone);
                    executor.executeAsync().then(done);
                }
                catch (e) {
                    vorpal.log(e);
                    done();
                }
            });
        }
        else
            done();
    }
}