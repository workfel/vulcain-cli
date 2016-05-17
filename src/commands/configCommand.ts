import {AbstractCommand} from './abstractCommand'

export class ConfigCommand extends AbstractCommand
{
    constructor(vorpal)
    {
        super(vorpal);
        
        let desc = "config  : Initialize default options";
        console.log("  - " + desc);
        
        let self = this;
        vorpal.command('config', desc)
            .option("--server, -H <server>", "Vulcain server address")
            .option("--token <token>", "Vulcain token")
            .option("--team <team>", "Team name", this.teamAutoCompletion.bind(this))
            .action(function (args, cb) {
                self.exec(args.options);
                cb();
            });
        console.log();
        this.exec({});
    }

    private teamAutoCompletion(input, callback) {
        let request = this.createRequest(["teams"], { startsWith: input });
        if (!request) return [];
        request.end((response) => {
            var templates = (response.ok && response.body && response.body.data) || [];
            callback(templates.map(t => t.name));
        });
    }   
        
    private exec(args)
    {
        var config = this.readOptions();
        var hasChanges = false;

        if (args.server) {
            if( !/^https?/i.test(args.server))
                args.server = "http://" + args.server;
            config.server = args.server;
            hasChanges = true;
        }

        if (args.token) {
            config.token = args.token;
            hasChanges = true;
        }

        if (args.template) {
            config.template = args.template;
            hasChanges = true;
        }

        if (args.folder) {
            config.folder = args.folder;
            hasChanges = true;
        }

        if (args.env) {
            config.env = args.env;
            hasChanges = true;
        }

        if (args.team) {
            config.team = args.team;
            hasChanges = true;
        }
        
        if (hasChanges) {
            this.saveOptions(config);
        }
        
        this.vorpal.log("Current settings : ");
        if (config.server) {
            this.vorpal.log("  - server  : " + config.server);
        }

        if (config.token) {
            this.vorpal.log(`  - token   : ${config.token.substr(0, 5)}...`);
        }

        if (config.template) {
            this.vorpal.log("  - template: " + config.template);
        }

        if (config.folder) {
            this.vorpal.log("  - folder  : " + config.folder);
        }
        else if (process.env["VULCAIN_PROJECT"]) {
            this.vorpal.log("  - folder  : " + process.env["VULCAIN_PROJECT"]);            
        }

        if (config.env) {
            this.vorpal.log("  - env     : " + config.env);
        }

        if (config.team) {
            this.vorpal.log("  - team    : " + config.team);
        }

        this.vorpal.log();
    }
}