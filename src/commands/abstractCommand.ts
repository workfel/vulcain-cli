import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
var Promise = require('promise');
var rest = require('unirest')
const fsAutocomplete = require('vorpal-autocomplete-fs');

interface IConfig {
    defaultProfile: string;
    data: any;
}

export abstract class AbstractCommand {

    private configFilePath: string;
    private homedir: string;
    private configDir: string;
    private static config:IConfig;
    
    constructor(protected vorpal) {
        this.homedir = os.homedir();
        this.configDir = path.join(this.homedir, ".vulcain");
        this.configFilePath = path.join(this.configDir, "configs.json");
    }

    protected fileAutoComplete() {
        return fsAutocomplete({ directory: true });
    }    

    protected createRequest(paths: Array<string>, query) {
        var options = this.readOptions();
        if (!options.server || !options.token) {
            this.vorpal.log("You must define a server address and a token with the config command.")
            return null;
        }

        let q = "";
        let sep = "?";
        for (var p in query) {
            if (!query.hasOwnProperty(p) || !query[p]) continue;
            q += sep + p + "=" + query[p];
            sep = "&";
        }
        const url = options.server + "/api/" + paths.join("/") + q;
        return rest.get(url)
            .header('Accept', 'application/json')
            .header('Authorization', "ApiKey " + options.token);
    }
    
    protected serviceAutoCompletion(input, callback) {
        let options = this.readOptions();
        let request = this.createRequest(["Service.all"], { team: options.team, name: input });
        if (!request) return [];
        request.end((response) => {
            var templates = (response.ok && response.body && response.body.value) || [];
            callback(templates.map(t => t.name));
        });
    }

    protected templateAutoCompletion(input, callback) {
        let request = this.createRequest(["Template.getnames"], { startsWith: input, kind: "Project" });
        if (!request) return [];
        request.end((response) => {
            var templates = (response.ok && response.body && response.body.value) || [];
            callback(templates);
        });
    }    

    protected teamAutoCompletion(input, callback) {
        let request = this.createRequest(["Team.names"], { startsWith: input });
        if (!request) return [];
        request.end((response) => {
            var teams = (response.ok && response.body && response.body.value) || [];
            callback(teams);
        });
    }   
    
    protected readOptions(profile?:string) {

        if (!AbstractCommand.config) {
            AbstractCommand.config = { defaultProfile: null, data: {}};
            if (fs.existsSync(this.configFilePath)) {
                try {
                    AbstractCommand.config = JSON.parse(fs.readFileSync(this.configFilePath, { encoding: "utf8" }));
                }
                catch (e) { }
            }
        }
        return AbstractCommand.config.data[profile || AbstractCommand.config.defaultProfile || "default"] || {};
    }

    protected listProfiles() {
        this.readOptions();
        var list = [];
        for (var p in AbstractCommand.config.data) {
            if (!AbstractCommand.config.data.hasOwnProperty(p)) continue;
            list.push(p + (AbstractCommand.config.defaultProfile === p ? " (current)" : ""));
        }
        return list;
    }   
    
    protected saveOptions(config, profile:string="default")
    {
        if (!fs.existsSync(this.homedir))
            fs.mkdirSync(this.homedir);
        if (!fs.existsSync(this.configDir))
            fs.mkdirSync(this.configDir);

        AbstractCommand.config.defaultProfile = profile;        
        AbstractCommand.config.data[profile] = config;
        config.profile = profile;
        fs.writeFileSync(this.configFilePath, JSON.stringify(AbstractCommand.config), { encoding: "utf8" });
        console.log("Settings saved.");
    }

    protected checkArguments(args, errors) {
        if (!args.server) {
            errors.push("Server address is required. Use --server or -H option.")
        }
        if (!args.token) {
            errors.push("Token is required. Use --token option.")
        }
    }

    protected prepareOptions(args)
    {
        let errors = [];
        let config = this.readOptions();

        args.baseDir = process.cwd();
        args.defaultFolder = config.defaultFolder;
        
        // Merge config
        if (!args.server) {
            args.server = config.server;
        }
        if(args.server) {
            if( !/^https?/i.test(args.server))
                args.server = "http://" + args.server;
        }
        else {
            errors.push("Server is not defined.");
        }
        if (!args.token && config.token) {
            args.token = config.token;
        }
        else {
            errors.push("Token is not defined.");
        }
        if (!args.team) {
            args.team = config.team;
        }
        if (!args.folder) {
            args.folder = config.folder;
        }
        if (!args.env) {
            args.env = config.env;
        }
        if (!args.template) {
            args.template = config.template;
        }
            
        this.checkArguments(args, errors);

        if (errors.length > 0) {
            for (var error in errors) {
                this.vorpal.log("  " + errors[error]);
            }
            return null;
        }        
        return args;
    }
}