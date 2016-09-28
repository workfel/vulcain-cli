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
            .option("--profile, -p <profile>", "Profile name (Default = default)")
            .option("--server, -H <server>", "Vulcain server address")
            .option("--token <token>", "Vulcain token")
            .option("--template <template>", "Default template", this.templateAutoCompletion.bind(this))
            .option("--folder, -f <folder>", "Project folder", this.fileAutoComplete)
            .option("--team <team>", "Team name", this.teamAutoCompletion.bind(this))
            .action(function (args, cb) {
                self.exec(args.options);
                cb();
            });
        console.log();
        this.exec({});
    }
        
    private exec(args)
    {
        var config = this.readOptions(args.profile);
        var hasChanges = !!args.profile;

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
            config.defaultFolder = args.folder;
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
            this.saveOptions(config, args.profile);
        }
        else {
            this.vorpal.log("Profile list :");
            for (var p of this.listProfiles()) {
                this.vorpal.log(" - " + p);
            }
            this.vorpal.log();
        }
        
        this.vorpal.log(`Settings for current profile '${config.profile}' : `);
        if (config.server) {
            this.vorpal.log("  - server  : " + config.server);
        }

        if (config.token) {
            this.vorpal.log(`  - token   : ${config.token.substr(0, 8)}...`);
        }

        if (config.template) {
            this.vorpal.log("  - template: " + config.template);
        }

        if (config.defaultFolder) {
            this.vorpal.log("  - folder  : " + config.defaultFolder);
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