import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import { Linter, LintError } from './Linter';
import * as util from './util';

//
// The Fasterer linter.
//

const OFFENSE_RE = /^(.*) Occurred at lines: ([^.]*)/gm;
const UNPROCESSABLE_RE = /Unprocessable files/;

export class Fasterer extends Linter {
	public constructor(settings: Settings) {
		super('fasterer', settings);
	}

	public get args(): string[] {
		let args = [];

		// tslint:disable-next-line no-invalid-template-strings
		args = ['${path}'];
		if (this.settings.rails) {
			args.unshift('-r');
		}

		return args;
	}

	public get runInTmpDirectory(): boolean {
		return true;
	}

	public get settingsFile(): string | undefined {
		return '.fasterer.yml';
	}

	public parseToDiagnostics(output: util.ExecFileOutput): vscode.Diagnostic[] {
		//
		// examine error
		// https://github.com/bbatsov/rubocop/blob/master/manual/basic_usage.md#exit-codes
		//

		if (output.error && output.error.code !== 1) {
			throw new LintError('unknown fasterer error', output);
		}

		// ignore 'Unprocessable files'
		if (output.stdout.match(UNPROCESSABLE_RE)) {
			return [];
		}

		//
		// now collect errors
		//

		const diagnostics = [];
		// tslint:disable-next-line no-constant-condition
		while (true) {
			const match = OFFENSE_RE.exec(output.stdout);
			if (!match) {
				break;
			}
			const message = match[1];
			const numbers = match[2].split(', ').map(i => parseInt(i, 10));
			numbers.forEach(lino => {
				// range. Note that offsets are zero-based
				const range = new vscode.Range(lino - 1, 0, lino - 1, 10000);
				const diagnostic = new vscode.Diagnostic(
					range,
					message,
					vscode.DiagnosticSeverity.Information
				);
				diagnostics.push(diagnostic);
			});
		}

		return diagnostics;
	}
}

//
// SAMPLE OUTPUT
//
// [0;31;49mlint.rb[0m
// Array#select.first is slower than Array#detect. Occurred at lines: 10, 18.
// [0;32;49m1 file inspected[0m, [0;31;49m2 offenses detected[0m
//
