import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import { Linter, LintError } from './Linter';
import * as util from './util';

//
// The Reek linter.
//

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

		const error: any = output.error;
		if (error && error.code !== 2) {
			throw new LintError("unknown reek error", output);
		}

		//
		// now collect errors
		//

		const json: any = JSON.parse(output.stdout);
		const diagnostics: vscode.Diagnostic[] = [];
		json.forEach((offense: any) => {
			offense.lines.forEach((line: number) => {
				// range. Note that offsets are zero-based
				const range: vscode.Range = new vscode.Range(line - 1, 0, line - 1, 10000);
				const message: string = `${offense.context}: ${offense.message}`;
				const diagnostic: vscode.Diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Information);
				diagnostic.source = `${this.exe}: ${offense.smell_type}`;
				diagnostics.push(diagnostic);
				return diagnostic;
			});
		});

		return diagnostics;
	}
}

// Reek.prototype.processError = function(data) {
// 	//similar to the ruby output, but we get a length
// 	let messageLines = [];
// 	data.split(EOL)
// 		.forEach(line => {
// 			if (!line.length) return;
// 			let m = /^STDIN:(\d+):(\d+): (?:(\w+): )?(.*)$/.exec(line);
// 			if (!m) {
// 				let marker = /^STDIN:\d+:\s*\^(\~*)\s*$/.exec(line);
// 				if (marker) {
// 					messageLines[messageLines.length - 1].location.length = (marker[1] || "")
// 						.length + 1;
// 				}
// 				return;
// 			}
// 			messageLines.push({
// 				location: {
// 					line: parseInt(m[1]),
// 					column: parseInt(m[2]),
// 					length: 10000
// 				},
// 				severity: m[3],
// 				message: m[4]
// 			});
// 		});
// 	return messageLines;
// };

// module.exports = Reek;

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
