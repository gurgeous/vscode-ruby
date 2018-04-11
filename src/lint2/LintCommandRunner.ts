import * as cp from 'child_process';
import * as _ from 'lodash';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import * as execFile from './execFile';
import { LintCommand } from './LintCommand';

//
// Helper for executing a lint process.
//

export class LintCommandRunner {
	private readonly command: LintCommand;
	private readonly document: vscode.TextDocument;

	constructor(command: LintCommand, document: vscode.TextDocument) {
		this.command = command;
		this.document = document;
	}

	//
	// main entry point
	//

	public run(): Promise<execFile.Results> {
		const ea: ExecFileArgs = this.execArgs;
		return execFile.execFile(ea.command, ea.args, ea.options, ea.stdin);
	}

	// what are we passing to execFile?
	private get execArgs(): ExecFileArgs {
		let command: string = this.command.path || '';
		let args: string[] = this.command.args.slice();

		// Are we using bundler? bundle exec
		if (command.length === 0 && this.command.commandSettings.useBundler) {
			command = this.command.commandSettings.pathToBundler;
			args.unshift('exec', this.command.exe);
		} else {
			command = path.join(command, `${this.command.exe}${this.ext}`);
		}

		// replace variables. why does one use $? unsure
		// tslint:disable-next-line no-invalid-template-strings
		command = command.replace('${workspaceRoot}', vscode.workspace.rootPath);
		// tslint:disable-next-line no-invalid-template-strings
		args = args.map((arg: string) => arg.replace('${path}', this.fileName));

		const options: cp.ExecFileOptions = { cwd: this.fileDir, env: process.env };
		const stdin: string = this.fileData;

		return { command, args, options, stdin };
	}

	private get ext(): string {
		return process.platform === 'win32' ? '.bat' : '';
	}

	//
	// from document
	//

	private get fileName(): string {
		return this.document.fileName || '';
	}

	private get fileDir(): string {
		return path.dirname(this.fileName);
	}

	private get fileData(): string {
		return this.document.getText();
	}
}

interface ExecFileArgs {
	command: string;
	args: string[];
	options: cp.ExecFileOptions;
	stdin?: string;
}
