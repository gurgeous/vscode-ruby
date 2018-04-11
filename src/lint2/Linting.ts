import * as _ from 'lodash';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import { Linter } from './Linter';
import { RuboCop } from './RuboCop';

// keep: fasterer (needs temp file), reek, rubocop

//
// Linting support
//

export class Linting {
	private settings: Settings;
	private debouncedLint: (document: vscode.TextDocument) => void;
	private linters: Linter[];

	public constructor(context: vscode.ExtensionContext) {
		this.settings = <Settings>vscode.workspace.getConfiguration('ruby');
		this.debouncedLint = _.debounce(this.lintDocument, this.settings.lintDebounceTime);
		this.linters = [new RuboCop(this.settings)];

		// register for vscode events
		this.register(context);

		// lint now
		vscode.window.visibleTextEditors.forEach((i: vscode.TextEditor) => {
			this.lintDocument(i.document);
		});

		context.subscriptions.push(this);
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
			vscode.workspace.onDidChangeConfiguration(this.onDidChangeConfiguration)
		);
	}

	public dispose(): void {
		// REMIND
	}

	// lint a document
	private lintDocument = (document: vscode.TextDocument): void => {
		if (!document || document.languageId !== 'ruby') {
			return;
		}
		this.linters.forEach((linter: Linter) => linter.run(document));
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

	private onDidChangeConfiguration = (): void => {
		// REMIND: apply new settings, then lint
		console.log('onDidChangeConfiguration');
	};
}
