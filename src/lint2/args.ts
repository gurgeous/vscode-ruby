import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { Args } from './execFile';
import { Linter } from './Linter';

export interface Context {
	fileName: string;
	cwd: string;
	data: string;
};

//
// Assemble linting command line arguments for a document. Given a Linter and a
// document, returns an execFile.args suitable for running the linter on the
// command line.
//

export function forContext(linter: Linter, context: Context): Args {
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

	// tslint:disable-next-line no-invalid-template-strings
	command = command.replace('${workspaceRoot}', vscode.workspace.rootPath);
	// tslint:disable-next-line no-invalid-template-strings
	args = args.map((arg: string) => arg.replace('${path}', context.fileName));

	// options
	const options: cp.ExecFileOptions = { cwd: context.cwd, env: process.env };

	// stdin
	const stdin: string = context.data;

	return { command, args, options, stdin };
}
