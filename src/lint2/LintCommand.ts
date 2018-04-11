import * as _ from 'lodash';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import * as execFile from './execFile';
import { LintCommandRunner } from './LintCommandRunner';

interface LintCommandSettings {
	pathToRuby: string;
	pathToBundler: string;
	useBundler: boolean;
	[key: string]: any;
}

const DEFAULTS: LintCommandSettings = {
	pathToRuby: 'ruby',
	pathToBundler: 'bundle',
	useBundler: false,
};

//
// Abstract superclass for our different linters. Contains the
// DiagnosticCollection for this type of linting. Each command can run the
// linter on a document (or text) and convert the output to diagnostics.
//

export abstract class LintCommand {
	public readonly exe: string;
	public commandSettings: LintCommandSettings;
	private diagnostics: vscode.DiagnosticCollection;

	public constructor(exe: string, settings: Settings) {
		this.exe = exe;
		this.diagnostics = vscode.languages.createDiagnosticCollection(exe);
		this.reload(settings);
	}

	// Load vscode user settings for this command. Note that stuff like useBundler
	// can be set either at the top level or specifically for this linter.
	public reload(settings: Settings): void {
		const levels: LintCommandSettings[] = [];

		// defaults
		levels.push(DEFAULTS);

		// global settings
		const globalSettings: LintCommandSettings = {
			pathToRuby: settings.interpreter.commandPath,
			pathToBundler: settings.pathToBundler,
			useBundler: settings.useBundler,
		};
		levels.push(globalSettings);

		// my settings
		if (settings.lint) {
			const mySettings: LintCommandSettings = settings.lint[this.exe];
			if (typeof mySettings === 'object') {
				levels.push(mySettings);
			}
		}

		// remove undefined before we call assign, so we don't overwrite earlier
		// values
		const withoutUndefined: LintCommandSettings[] = levels.map((obj: LintCommandSettings) => {
			const copy: any = {};
			for (const key of Object.keys(obj)) {
				const value: any = obj[key];
				if (value !== undefined) {
					copy[key] = value;
				}
			}
			return <LintCommandSettings>copy;
		});

		// calculate final settings
		this.commandSettings = Object.assign({}, ...withoutUndefined);
	}

	public async run(document: vscode.TextDocument): Promise<void> {
		// run command
		const runner: LintCommandRunner = new LintCommandRunner(this, document);
		let output: execFile.Results;
		try {
			output = await runner.run();
		} catch (e) {
			const msg: string = `vscode-ruby failed to lint '${e}'`;
			vscode.window.showErrorMessage(msg);
			console.error(msg);
			return;
		}

		// parse
		let diagnostics: vscode.Diagnostic[];
		try {
			diagnostics = this.parseToDiagnostics(output);
			console.log(diagnostics);
		} catch (e) {
			const msg: string = `vscode-ruby failed to parse '${e}'`;
			vscode.window.showErrorMessage(msg);
			console.error(msg);
			return;
		}

		// now add diagnostics
		// REMIND: clear this first in case of errors?
		this.diagnostics.set(document.uri, diagnostics);
	}

	//
	// subclasses can override these
	//

	public get args(): string[] {
		return [];
	}

	public get path(): string {
		return this.commandSettings.path;
	}

	public get runInTempDirectory(): boolean {
		return false;
	}

	// What is the name of this lint command's settings file? We may have to copy
	// this into our temp directory when needsTempDirectory is used.
	public get settingsFile(): string | undefined {
		return undefined;
	}

	public abstract parseToDiagnostics(output: execFile.Results): vscode.Diagnostic[];
}

// update pend/active

// if temp
//   create temp dir
//   copy settings
//   run linter + process results + updateForFile (add diag)
//   cleanup
// else
//   run linter + process results + updateForFile (add diag)
//
// update active
// honor pend
//
// updateForFile

// are we enabled? if not, delete

// function RuboCop(opts) {
// 	this.exe = "rubocop";
// 	this.ext = process.platform === 'win32' ? ".bat" : "";
// 	this.path = opts.path;
// 	this.responsePath = "stdout";

// 	this.args = ["-s", "{path}", "-f", "json"] ;

// 	if (opts.forceExclusion) this.args.push("--force-exclusion");
// 	if (opts.lint) this.args.push("-l");
// 	if (opts.only) this.args = this.args.concat("--only", opts.only.join(','));
// 	if (opts.except) this.args = this.args.concat("--except", opts.except.join(','));
// 	if (opts.rails) this.args.push('-R');
// }

// 	function Fasterer(opts) {
// 		this.exe = "fasterer";
// 		this.ext = require('os')
// 						.platform() === 'win32' ? ".bat" : "";
// 		this.path = opts.path;
// 		this.responsePath = "stdout";
// 		this.args = ['{path}'];
// 		this.temp = true;
// 		this.settings = ".fasterer.yml";

// 		if (opts.rails) this.args.unshift('-r');
// }

// function Reek(opts) {
// 	this.exe = "reek";
// 	this.ext = process.platform === 'win32' ? ".bat" : "";
// 	this.path = opts.path;
// 	this.responsePath = "stdout";
// 	this.errorPath = "stderr";
// 	this.args = ["-f", "json"];
// }
