import * as _ from 'lodash';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import { Linter } from './Linter';

import { Fasterer } from './Fasterer';
import { Reek } from './Reek';
import { RuboCop } from './RuboCop';

// keep: reek

//
// Linting support. This class contains a list of external command line linters
// which are enabled/disabled on demand depending on user settings. Each Linter
// object wraps one an external linter, and can use that linter to generate
// Diagnostics.
//

export class Linting {
	private settings: Settings;
	private debouncedLint: (document: vscode.TextDocument) => void;
	private linters: Linter[];

	public constructor(context: vscode.ExtensionContext) {
		this.settings = <Settings>vscode.workspace.getConfiguration('ruby');
		this.debouncedLint = _.debounce(this.lintDocument, this.settings.lintDebounceTime);
		this.linters = [
			// new RuboCop(this.settings),
			// new Fasterer(this.settings),
			new Reek(this.settings),
		];

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
		this.linters.forEach((linter: Linter) => {
			try {
				linter.run(document)
			} catch (e) {
				const msg: string = `vscode-ruby failed to lint ${document.fileName} '${e}'`;
				vscode.window.showErrorMessage(msg);
				console.error(msg);
			}
		});
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
