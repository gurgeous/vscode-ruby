import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import { Linter, LintError } from './Linter';
import * as util from './util';

//
// The Reek linter.
//

// see example at bottom
interface ReekOffense {
	context: string;
	lines: number[];
	message: string;
	smell_type: string;
}

export class Reek extends Linter {
	public constructor(settings: Settings) {
		super('reek', settings);
	}

	public get args(): string[] {
		return ['-f', 'json'];
	}

	public parseToDiagnostics(output: util.ExecFileOutput): vscode.Diagnostic[] {
		//
		// examine error
		//

		if (output.error && output.error.code !== 2) {
			throw new LintError('unknown reek error', output);
		}

		//
		// now collect errors
		//

		const json: ReekOffense[] = JSON.parse(output.stdout);
		const diagnostics: vscode.Diagnostic[] = [];
		json.forEach((offense: ReekOffense) => {
			offense.lines.forEach((line: number) => {
				// range. Note that offsets are zero-based
				const range: vscode.Range = new vscode.Range(line - 1, 0, line - 1, 10000);
				const message: string = `${offense.context}: ${offense.message}`;
				const diagnostic: vscode.Diagnostic = new vscode.Diagnostic(
					range,
					message,
					vscode.DiagnosticSeverity.Information
				);
				diagnostic.source = `${this.exe}: ${offense.smell_type}`;
				diagnostics.push(diagnostic);

				return diagnostic;
			});
		});

		return diagnostics;
	}
}

//
// SAMPLE OUTPUT
//
// [
//   {
//     "context": "ProfilesControllerTest#setup",
//     "lines": [ 6, 7 ],
//     "message": "calls 'create(:user)' 2 times",
//     "smell_type": "DuplicateMethodCall",
//   },
//   ...
// ]
