import * as _ from 'lodash';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import * as execFile from './execFile';
import { Linter } from './Linter';

const SEVERITIES: { [key: string]: vscode.DiagnosticSeverity } = {
	refactor: vscode.DiagnosticSeverity.Hint,
	convention: vscode.DiagnosticSeverity.Information,
	info: vscode.DiagnosticSeverity.Information,
	warning: vscode.DiagnosticSeverity.Warning,
	error: vscode.DiagnosticSeverity.Error,
	fatal: vscode.DiagnosticSeverity.Error,
};

//
// The RuboCop linter.
//

export class RuboCop extends Linter {
	public constructor(settings: Settings) {
		super('rubocop', settings);
	}

	public get args(): string[] {
		let args: string[] = [];

		// tslint:disable-next-line no-invalid-template-strings
		args = ['-s', '${path}', '-f', 'json'];

		// calculate args
		if (this.settings.forceExclusion) {
			args.push('--force-exclusion');
		}
		if (this.settings.lint) {
			args.push('-l');
		}
		if (this.settings.rails) {
			args.push('-R');
		}
		for (const key of ['only', 'except', 'require']) {
			const value: string[] = this.settings[key];
			if (value) {
				args = args.concat(`--${key}`, value.join(','));
			}
		}

		return args;
	}

	public parseToDiagnostics(output: execFile.Output): vscode.Diagnostic[] {
		const error: any = output.error;

		// https://github.com/bbatsov/rubocop/blob/master/manual/basic_usage.md#exit-codes
		if (error && error.code !== 1) {
			// REMIND: fail loudly
			throw error;
		}

		const stdout: string = output.stdout;
		if (stdout === '') {
			return [];
		}

		// sanity
		const json: any = JSON.parse(stdout);
		if (!(json && json.files && json.files[0] && json.files[0].offenses)) {
			return [];
		}

		const offenses: any[] = json.files[0].offenses;
		return offenses.map((o: any): vscode.Diagnostic => {
			// range. Note that offsets are zero-based
			const loc: any = o.location;
			const line: number = loc.line - 1;
			const startCharacter: number = loc.column - 1;
			const endCharacter: number = startCharacter + loc.length;
			const range: vscode.Range = new vscode.Range(line, startCharacter, line, endCharacter);

			// sev
			const severity: vscode.DiagnosticSeverity =
				SEVERITIES[o.severity] || vscode.DiagnosticSeverity.Error;

			const diagnostic: vscode.Diagnostic = new vscode.Diagnostic(range, o.message, severity);
			diagnostic.source = o.cop_name;
			return diagnostic;
		});
	}
}

// SAMPLE JSON OUTPUT
//
// {
//   "summary":{
//     "offense_count":3,
//   },
//   "files":[
//     {
//       "path":"users_controller_test.rb",
//       "offenses":[
//         {
//           "severity":"warning",
//           "message":"Lint/UselessAssignment: Useless assignment to variable - `x`.",
//           "cop_name":"Lint/UselessAssignment",
//           "location":{
//             "line":7,
//             "column":5
//             "length":1,
//           }
//         },
//         ...
// }
