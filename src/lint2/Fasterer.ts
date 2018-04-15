import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import * as execFile from './execFile';
import { Linter } from './Linter';

//
// The Fasterer linter.
//

export class Fasterer extends Linter {
	public constructor(settings: Settings) {
		super('fasterer', settings);
	}

	public get args(): string[] {
		let args: string[] = [];

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

	public parseToDiagnostics(output: execFile.Output): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		const re: RegExp = /^(.*) Occurred at lines: ([^.]*)/gm;

		// tslint:disable-next-line no-constant-condition
		while (true) {
			const match: RegExpMatchArray | null = re.exec(output.stdout);
			if (!match) {
				break;
			}
			const message: string = match[1];
			const numbers: number[] = match[2].split(', ').map((i: string) => parseInt(i, 10));
			numbers.forEach((lino: number) => {
				// range. Note that offsets are zero-based
				const range: vscode.Range = new vscode.Range(lino - 1, 1, lino - 1, 10000);
				const diagnostic: vscode.Diagnostic = new vscode.Diagnostic(
					range,
					message,
					vscode.DiagnosticSeverity.Information
				);
				diagnostic.source = this.exe;
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
