import { debounce } from 'lodash';
// tslint:disable-next-line no-implicit-dependencies
import * as vscode from 'vscode';
import { LintCollection } from '../lint/lintCollection';
import { LintConfig } from '../lint/lintConfig';

export function registerLinters(ctx: vscode.ExtensionContext): void {
	const globalConfig: LintConfig = new LintConfig();
	const linters: LintCollection = new LintCollection(
		globalConfig,
		vscode.workspace.getConfiguration('ruby').lint,
		vscode.workspace.rootPath
	);
	ctx.subscriptions.push(linters);

	function executeLinting(e: vscode.TextEditor | vscode.TextDocumentChangeEvent): void {
		if (!e) {
			return;
		}
		linters.run(e.document);
	}

	// Debounce linting to prevent running on every keypress, only run when typing has stopped
	const lintDebounceTime: number = vscode.workspace.getConfiguration('ruby').lintDebounceTime;
	const executeDebouncedLinting: any = debounce(executeLinting, lintDebounceTime);

	// new editor? lint right now
	ctx.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(executeLinting));
	// text change? lint after debounce
	ctx.subscriptions.push(vscode.workspace.onDidChangeTextDocument(executeDebouncedLinting));

	// config change? reconfigure all linters and run right now
	ctx.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(() => {
			// reconfigure
			const updatedConfig: LintConfig = new LintConfig();
			linters.cfg(vscode.workspace.getConfiguration('ruby').lint, updatedConfig);

			// run on all docs
			const docs: vscode.TextDocument[] = vscode.window.visibleTextEditors.map((editor: vscode.TextEditor) => editor.document);
			docs.forEach((doc: vscode.TextDocument) => linters.run(doc));
		})
	);

	// run against all of the current open files right now
	vscode.window.visibleTextEditors.forEach(executeLinting);
}
