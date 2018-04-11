// tslint:disable-next-line no-implicit-dependencies
import * as vscode from 'vscode';

/**
 * Global user linting settings from vscode. See package.json.
 */
export class LintConfig {
	public readonly pathToRuby: string = 'ruby';
	public readonly pathToBundler: string = 'bundle';
	public readonly useBundler: boolean = false;

	constructor() {
		const pathToRuby: string = vscode.workspace.getConfiguration("ruby.interpreter").commandPath;
		if (pathToRuby) {
			this.pathToRuby = pathToRuby;
		}

		const useBundler: boolean = vscode.workspace.getConfiguration("ruby").useBundler;
		if (useBundler) {
			this.useBundler = useBundler;
		}

		const pathToBundler: string = vscode.workspace.getConfiguration("ruby").pathToBundler;
		if (pathToBundler) {
			this.pathToBundler = pathToBundler;
		}
	}
}
