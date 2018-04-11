import * as _ from 'lodash';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import { LintCommand, Offense } from './LintCommand';

export class RuboCop extends LintCommand {
	public constructor(settings: Settings) {
		super('rubocop', settings);
	}

	public get args(): string[] {
		let args: string[] = [];

		// tslint:disable-next-line no-invalid-template-strings
		args = ['-s', '${path}', '-f', 'json'];

		// calculate args
		if (this.commandSettings.forceExclusion) {
			args.push('--force-exclusion');
		}
		if (this.commandSettings.lint) {
			args.push('-l');
		}
		if (this.commandSettings.rails) {
			args.push('-R');
		}
		for (const key of ['only', 'except', 'require']) {
			const value: string[] = this.commandSettings[key];
			if (value) {
				args = args.concat(`--${key}`, value.join(','));
			}
		}

		return args;
	}

	public parseOutputToOffenses(output: string): Offense[] {
		if (output === '') {
			return [];
		}

		// sanity
		const json: any = JSON.parse(output);
		if (!(json && json.files && json.files[0] && json.files[0].offenses)) {
			return [];
		}

		const offenses: any[] = json.files[0].offenses;
		return offenses.map((o: any): Offense => {
			const loc: any = o.location;

			// need these offsets to be zero-based
			const line: number = o.location.line - 1;
			const startCharacter: number = o.location.column - 1;
			const endCharacter: number = startCharacter + o.location.length;
			const range: vscode.Range = new vscode.Range(line, startCharacter, line, endCharacter);

			return {
				range,
				message: o.message,
				severity: o.severity,
				source: o.cop_name,
			};
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
