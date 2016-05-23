import {AbstractCommand} from './abstractCommand'
import {Engine} from '../util/manifestEngine'

export class InitCommand extends AbstractCommand
{
    constructor(vorpal)
    {
        super(vorpal);
        
        let desc = "init    : Initialize team context";
        vorpal.log("  - " + desc);
        
        let self = this;
        vorpal.command('init', desc)
            .option("-H <server>", "Vulcain server address")
            .option("--token <token>", "Vulcain token")
            .option("--team <team>", "Team name", this.teamAutoCompletion.bind(this))
            .action(function (args, cb) {
                self.exec(this, args, cb);
            });
    }

    private teamAutoCompletion(input, callback) {
        let request = this.createRequest(["teams"], { startsWith: input });
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
                vorpal.log("Initialize developpement context for team " + options.team);
                vorpal.log("Get initialization script from " + options.server);
                vorpal.log("");

                let request = this.createRequest(["teams", options.team, "context"], {});
                request.end( async (response) => {
                    if (response.ok) {
                        let manifest = response.body;
                        if (!manifest) {
                            vorpal.log("Nothing to do.");
                        }
                        else {
                            if (manifest.preCommands) {
                                let commands = manifest.preCommands.split('\n').replace(/[\r\n]/g, "").trim();
                                vorpal.log("Running pre-commands : ");
                                let engine = new Engine(vorpal, { scripts: { all: { "$context": commands } } });
                                try {
                                    await engine.execScriptsAsync("$context");
                                }
                                catch (e) {
                                    vorpal.log("Error : " + e);
                                }
                            }
                            if (manifest.node) {
                                vorpal.log("Running script : ");
                                let code = "exports.init = function() {" + manifest.node + "}";
                                try {
                                    this.execFromString(code);
                                }
                                catch (e) {
                                    vorpal.log( "Error in javascript code : " + e);
                                }
                            }
                            if (manifest.postCommands) {
                                let commands = manifest.postCommands.split('\n').replace(/[\r\n]/g, "").trim();
                                vorpal.log("Running post-commands : ");
                                let engine = new Engine({ scripts: { all: { "$context": commands } } });
                                try {
                                    await engine.execScriptsAsync("$context");
                                }
                                catch (e) {
                                    vorpal.log("Error : " + e);
                                }
                            }
                        }
                    }
                    else {
                        vorpal.log("Server error : " + (((response.body && response.body.message) || response.body) || response.statusMessage || response.error))
                    }
                    done();
                });
            }
    }

    execFromString(code) {
        let m = new (<any>module).constructor();
        m.paths = (<any>module).paths;
        m._compile(code);
        let exports = m.exports;
        exports.init();
    }
}