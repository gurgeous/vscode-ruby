import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import * as execFile from './execFile';
import { Linter } from './Linter';

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

	public parseToDiagnostics(output: execFile.Output): vscode.Diagnostic[] {
		if (!output.stdout) {
			return [];
		}
		const json: any = JSON.parse(output.stdout);
		const diagnostics: vscode.Diagnostic[] = [];
		json.forEach((offense: any) => {
			offense.lines.forEach((line: number) => {
				// range. Note that offsets are zero-based
				const range: vscode.Range = new vscode.Range(line - 1, 1, line - 1, 10000);
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

// Reek.prototype.processResult = function(data) {
// 	if (!data) return [];
// 	let offenses = JSON.parse(data);
// 	let messageLines = [];
// 	offenses.forEach(offense => {
// 		offense.lines.forEach(line => {
// 			messageLines.push({
// 				location: {
// 					line: line,
// 					column: 1,
// 					length: 10000
// 				},
// 				message: offense.context + ": " + offense.message,
// 				cop_name: this.exe + ":" + offense.smell_type,
// 				severity: "info"
// 			});
// 		});
// 	});
// 	return messageLines;
// };
// const EOL = require("os")
// 	.EOL;

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
