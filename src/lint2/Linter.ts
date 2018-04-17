import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as os from 'os';
import * as path from 'path';
import * as tmp from 'tmp';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import * as args from './args';
import * as util from './util';

//
// Abstract superclass for our various linters. Each linter runs on a document
// (or subset) and converts the linter output to Diagnostics.
//

// these settings can be set globally or per-linter
interface LinterSettings {
	pathToRuby: string;
	pathToBundler: string;
	useBundler: boolean;
	// tslint:disable-next-line no-any
	[key: string]: any;
}

// default linter settings
const DEFAULTS = {
	pathToRuby: 'ruby',
	pathToBundler: 'bundle',
	useBundler: false,
};

export class LintError extends Error {
	public output: util.ExecFileOutput;

	constructor(message: string, output: util.ExecFileOutput) {
		super(message);
		this.output = output;
		Error.captureStackTrace(this, LintError);
	}
}

export abstract class Linter {
	public readonly exe: string;
	public settings: LinterSettings;
	private enabled: boolean;

	// ctor
	public constructor(exe: string, settings: Settings) {
		this.exe = exe;
		this.reload(settings);
	}

	// Load vscode user settings for this linter. Note that stuff like useBundler
	// can be set either at the top level or specifically for this linter.
	public reload(settings: Settings) {
		const levels = [];

		// defaults
		levels.push(DEFAULTS);

		// global settings
		const globalSettings = {
			pathToRuby: settings.interpreter.commandPath,
			pathToBundler: settings.pathToBundler,
			useBundler: settings.useBundler,
		};
		levels.push(globalSettings);

		// my settings
		if (settings.lint) {
			const mySettings = settings.lint[this.exe];
			if (typeof mySettings === 'object') {
				levels.push(mySettings);
			}
		}

		// remove undefined before we call assign, so we don't overwrite earlier
		// values
		const withoutUndefined = levels.map(obj => {
			// tslint:disable-next-line no-any
			const copy = {};
			for (const key of Object.keys(obj)) {
				// tslint:disable-next-line no-any
				const value = obj[key];
				if (value !== undefined) {
					copy[key] = value;
				}
			}

			return <LinterSettings>copy;
		});

		// calculate final settings
		this.settings = Object.assign({}, ...withoutUndefined);
		this.enabled = Boolean(settings.lint[this.exe]);
	}

	// Run this linter on a document.
	public async run(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
		if (!this.enabled) {
			return [];
		}

		//
		// create context
		//

		const context = {
			fileName: document.fileName,
			cwd: path.dirname(document.fileName),
			data: document.getText(),
		};

		//
		// tmp? adjust context if necessary. Use a random tmp directory that gets
		// removed in a finally block, so that our linters can run in parallel
		// without fear of overlap.
		//

		let tmpDir;
		if (this.runInTmpDirectory) {
			tmpDir = await tmp.dirSync().name;
		}

		try {
			if (tmpDir) {
				// prepare tmp dir
				const tmpFile = path.join(tmpDir, 'lint.rb');
				await fs.writeFile(tmpFile, context.data);
				await this.linkSettings(context.cwd, tmpDir);

				// and now update context
				context.fileName = path.basename(tmpFile);
				context.cwd = tmpDir;
			}

			//
			// run/parse
			//

			// get arguments, run
			const ea = args.forContext(this, context);
			const output = await util.execFile(ea);

			// parse
			const diagnostics = this.parseToDiagnostics(output);
			diagnostics.forEach((diagnostic: vscode.Diagnostic) => {
				if (!diagnostic.source) {
					diagnostic.source = this.exe;
				}
			});

			return diagnostics;
		} finally {
			if (tmpDir) {
				fs.remove(tmpDir);
			}
		}
	}

	//
	// subclasses should override these
	//

	public abstract get args(): string[];

	public get runInTmpDirectory(): boolean {
		return false;
	}

	// What is the name of this linter's settings file? We may have to copy this
	// into our tmp directory when runInTmpDirectory is used.
	public get settingsFile(): string | undefined {
		return undefined;
	}

	public abstract parseToDiagnostics(output: util.ExecFileOutput): vscode.Diagnostic[];

	//
	// helpers
	//

	// copy settings into tmp dir
	private async linkSettings(srcDir: string, dstDir: string): Promise<void> {
		const settingsFile = this.settingsFile;
		if (!settingsFile) {
			return;
		}

		// look upward, then try HOME
		let srcFile;
		srcFile = await util.lookUpward(srcDir, settingsFile);
		if (!srcFile) {
			const checkFile = path.join(process.env.HOME, settingsFile);
			if (await util.isReadable(checkFile)) {
				srcFile = checkFile;
			}
		}
		if (!srcFile) {
			return;
		}

		// got it! link
		const dstFile = path.join(dstDir, settingsFile);
		await fs.link(srcFile, dstFile);
	}
}
