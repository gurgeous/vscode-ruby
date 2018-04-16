import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import * as args from './args';
import * as execFile from './execFile';

//
// Abstract superclass for our various linters. Each linter runs on a document
// (or subset) and converts the linter output to Diagnostics.
//

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
		//
		// create context
		//

		const context: args.Context = {
			fileName: document.fileName,
			cwd: path.dirname(document.fileName),
			data: document.getText(),
		};

		//
		// tmp? adjust context if necessary
		//

		if (this.runInTmpDirectory) {
			// make dir
			const tmpDir: string = path.join(os.tmpdir(), 'vscode_ruby_lint');
			const tmpFile: string = path.join(tmpDir, 'lint.rb');

			// prepare tmp dir
			await fs.emptyDir(tmpDir);
			await fs.writeFile(tmpFile, context.data);
			await this.linkSettings(context.cwd, tmpDir);

			// and now update context
			context.fileName = path.basename(tmpFile);
			context.cwd = tmpDir;
		}

		//
		// run
		//

		// get arguments, run
		const ea: execFile.Args = args.forContext(this, context);
		const output: execFile.Output = await execFile.execFile(ea);

		// parse
		// REMIND: clear this first in case of errors?
		const diagnostics: vscode.Diagnostic[] = this.parseToDiagnostics(output);
		diagnostics.forEach((diagnostic: vscode.Diagnostic) => {
			if (!diagnostic.source) {
				diagnostic.source = this.exe;
			}
		});
		console.log(diagnostics);
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

	public get runInTmpDirectory(): boolean {
		return false;
	}

	// What is the name of this linter's settings file? We may have to copy this
	// into our tmp directory when runInTmpDirectory is used.
	public get settingsFile(): string | undefined {
		return undefined;
	}

	public abstract parseToDiagnostics(output: execFile.Output): vscode.Diagnostic[];

	//
	// helpers
	//

	// is file readable?
	private async isReadable(file: string): Promise<boolean> {
		try {
			await fs.access(file, fs.constants.R_OK);
		} catch (e) {
			return false;
		}
		return true;
	}

	// look in dir (and above) for a file
	private async lookUpward(srcDir: string, file: string): Promise<string | undefined> {
		let dir: string = srcDir;

		// tslint:disable-next-line no-constant-condition
		while (true) {
			const checkFile: string = path.join(dir, file);
			if (await this.isReadable(checkFile)) {
				// success!
				return checkFile;
			}
			const parentDir: string = path.dirname(dir);
			if (parentDir === dir) {
				// failure
				return undefined;
			}
			dir = parentDir;
		}
	}

	// copy settings into tmp dir
	private async linkSettings(srcDir: string, dstDir: string): Promise<void> {
		const settingsFile: string | undefined = this.settingsFile;
		if (!this.settingsFile) {
			return;
		}

		let srcFile: string | undefined;

		// look upward, then try HOME
		srcFile = await this.lookUpward(srcDir, settingsFile);
		if (!srcFile) {
			const checkFile: string = path.join(process.env.HOME, settingsFile);
			if (await this.isReadable(checkFile)) {
				srcFile = checkFile;
			}
		}
		if (!srcFile) {
			return;
		}

		// got it! link
		const dstFile: string = path.join(dstDir, settingsFile);
		await fs.link(srcFile, dstFile);
	}
}
