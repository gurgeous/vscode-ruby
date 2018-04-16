import * as _ from 'lodash';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import { Linter, LintError } from './Linter';

import { Fasterer } from './Fasterer';
import { Reek } from './Reek';
import { RuboCop } from './RuboCop';

//
// Linting support. This class contains a list of external command line linters
// which are enabled/disabled on demand depending on user settings. Each Linter
// object wraps one an external linter, and can use that linter to generate
// Diagnostics.
//

export class Linting {
	// complete "ruby" settings
	private settings: Settings;

	// list of linters (rubocop, fasterer, reek)
	private linters: Linter[];

	// keep track of which documents are currently being linted
	private running: Map<vscode.Uri, boolean>;

	// don't lint too often
	private debouncedLint: (document: vscode.TextDocument) => void;

	// collection of diagnostics (offenses)
	private diagnosticsCollection: vscode.DiagnosticCollection;

	public constructor(context: vscode.ExtensionContext) {
		this.settings = <Settings>vscode.workspace.getConfiguration('ruby');
		this.linters = [
			new RuboCop(this.settings),
			new Fasterer(this.settings),
			new Reek(this.settings),
		];
		this.running = new Map<vscode.Uri, boolean>();
		this.debouncedLint = _.debounce(this.lintDocument, this.settings.lintDebounceTime);
		this.diagnosticsCollection = vscode.languages.createDiagnosticCollection('ruby');
		context.subscriptions.push(this.diagnosticsCollection);

		// register for vscode events
		this.register(context);
		// lint now
		this.lintAllEditors();
	}

	// register for vscode events
	public register(context: vscode.ExtensionContext): void {
		context.subscriptions.push(
			vscode.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor)
		);
		context.subscriptions.push(
			vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument)
		);
		context.subscriptions.push(
			vscode.workspace.onDidCloseTextDocument(this.onDidCloseTextDocument)
		);
		context.subscriptions.push(
			vscode.workspace.onDidChangeConfiguration(this.onDidChangeConfiguration)
		);
	}

	// Walk editors, lint docs.
	private lintAllEditors(): void {
		vscode.window.visibleTextEditors.forEach((textEditor: vscode.TextEditor) => {
			this.lintDocument(textEditor.document);
		});
	}

	// Lint a single document.
	private lintDocument = async (document: vscode.TextDocument): Promise<void> => {
		// is this ruby?
		if (!document || document.languageId !== 'ruby') {
			return;
		}

		// are we already linting this doc?
		if (this.running.get(document.uri)) {
			return;
		}
		this.running.set(document.uri, true);

		// Run linters (collect promises) and wait for them to complete. Note that
		// there is an edge case if multiple linters are enabled and one of them
		// throws an error. Promise.all doesn't wait for all promises to complete if
		// one of them throws an error.
		const promises: any[] = this.linters.map((l: Linter) => l.run(document));
		try {
			const perLinter: vscode.Diagnostic[][] = await Promise.all(promises);
			const diagnostics: vscode.Diagnostic[] = [].concat.apply([], perLinter);
			this.diagnosticsCollection.set(document.uri, diagnostics);
		} catch (e) {
			// clear diagnostics
			this.diagnosticsCollection.delete(document.uri);
			const msg: string = `vscode-ruby failed to lint ${document.fileName} '${e}'`;
			vscode.window.showErrorMessage(msg);

			// log
			console.error(e);
			if (e instanceof LintError) {
				console.log("-- underlying error --");
				console.log(e.output.error);
				if (e.output.stdout) {
					console.log("-- stdout --");
					console.log(e.output.stdout);
				}
				if (e.output.stderr) {
					console.log("-- stderr --");
					console.log(e.output.stderr);
				}
			}
		}

		this.running.set(document.uri, false);
	};

	//
	// events from vscode
	//

	private onDidChangeActiveTextEditor = (textEditor: vscode.TextEditor): void => {
		if (!textEditor) {
			return;
		}
		this.lintDocument(textEditor.document);
	};

	private onDidChangeTextDocument = (changeEvent: vscode.TextDocumentChangeEvent): void => {
		this.debouncedLint(changeEvent.document);
	};

	private onDidCloseTextDocument = (document: vscode.TextDocument): void => {
		this.diagnosticsCollection.delete(document.uri);
	};

	private onDidChangeConfiguration = (): void => {
		this.settings = <Settings>vscode.workspace.getConfiguration('ruby');
		this.linters.forEach((linter: Linter) => linter.reload(this.settings));
		this.lintAllEditors();
	};
}
