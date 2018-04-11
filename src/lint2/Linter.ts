import * as _ from 'lodash';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import * as args from './args';
import * as execFile from './execFile';

// these settings can be set globally or per-linter
interface LinterSettings {
	pathToRuby: string;
	pathToBundler: string;
	useBundler: boolean;
	[key: string]: any;
}

// default linter settings
const DEFAULTS: LinterSettings = {
	pathToRuby: 'ruby',
	pathToBundler: 'bundle',
	useBundler: false,
};

//
// Abstract superclass for our various linters. Each linter runs on a document
// (or text) and converts the linter output to Diagnostics.
//

export abstract class Linter {
	public readonly exe: string;
	public settings: LinterSettings;
	private diagnostics: vscode.DiagnosticCollection;

	// ctor
	public constructor(exe: string, settings: Settings) {
		this.exe = exe;
		this.diagnostics = vscode.languages.createDiagnosticCollection(exe);
		this.reload(settings);
	}

	// Load vscode user settings for this linter. Note that stuff like useBundler
	// can be set either at the top level or specifically for this linter.
	public reload(settings: Settings): void {
		const levels: LinterSettings[] = [];

		// defaults
		levels.push(DEFAULTS);

		// global settings
		const globalSettings: LinterSettings = {
			pathToRuby: settings.interpreter.commandPath,
			pathToBundler: settings.pathToBundler,
			useBundler: settings.useBundler,
		};
		levels.push(globalSettings);

		// my settings
		if (settings.lint) {
			const mySettings: LinterSettings = settings.lint[this.exe];
			if (typeof mySettings === 'object') {
				levels.push(mySettings);
			}
		}

		// remove undefined before we call assign, so we don't overwrite earlier
		// values
		const withoutUndefined: LinterSettings[] = levels.map((obj: LinterSettings) => {
			const copy: any = {};
			for (const key of Object.keys(obj)) {
				const value: any = obj[key];
				if (value !== undefined) {
					copy[key] = value;
				}
			}
			return <LinterSettings>copy;
		});

		// calculate final settings
		this.settings = Object.assign({}, ...withoutUndefined);
	}

	public async run(document: vscode.TextDocument): Promise<void> {
		let output: execFile.Output;
		try {
			// get arguments
			const ea: execFile.Args = args.forDocument(this, document);
			// run child process
			output = await execFile.execFile(ea);
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
	// subclasses should override these
	//

	public get args(): string[] {
		return [];
	}

	public get path(): string {
		return this.settings.path;
	}

	public get runInTempDirectory(): boolean {
		return false;
	}

	// What is the name of this linter's settings file? We may have to copy this
	// into our temp directory when needsTempDirectory is used.
	public get settingsFile(): string | undefined {
		return undefined;
	}

	public abstract parseToDiagnostics(output: execFile.Output): vscode.Diagnostic[];
}
