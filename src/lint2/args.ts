import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { Args } from './execFile';
import { Linter } from './Linter';

//
// Assemble linting command line arguments for a document. Given a Linter and a
// document, returns an execFile.args suitable for running the linter on the
// command line.
//

export function forDocument(linter: Linter, document: vscode.TextDocument): Args {
	//
	// Finalize args
	//

	let command: string = linter.path || '';
	let args: string[] = linter.args.slice();
	if (command.length === 0 && linter.settings.useBundler) {
		command = linter.settings.pathToBundler;
		args.unshift('exec', linter.exe);
	} else {
		const ext: string = process.platform === 'win32' ? '.bat' : '';
		command = path.join(command, `${linter.exe}${ext}`);
	}

	//
	// Replace variables
	//

	const fileName: string = document.fileName || 'unknown.rb';
	// tslint:disable-next-line no-invalid-template-strings
	command = command.replace('${workspaceRoot}', vscode.workspace.rootPath);
	// tslint:disable-next-line no-invalid-template-strings
	args = args.map((arg: string) => arg.replace('${path}', fileName));

	// options
	const cwd: string = document.fileName
		? path.dirname(document.fileName)
		: vscode.workspace.rootPath;
	const options: cp.ExecFileOptions = { cwd, env: process.env };

	// stdin
	const stdin: string = document.getText();

	return { command, args, options, stdin };
}

export function forData(linter: Linter, data: string): void {
	// REMIND
}
