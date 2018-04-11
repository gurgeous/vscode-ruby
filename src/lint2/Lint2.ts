import * as _ from 'lodash';
import * as path from 'path';
import * as vscode from 'vscode';
import { Settings } from '../Settings';
import { LintCommand } from './LintCommand';
import { RuboCop } from './RuboCop';

// fasterer (needs temp file), reek, rubocop

//
// Linting support
//

export class Lint2 {
	private debouncedLint: (document: vscode.TextDocument) => void;
	private settings: Settings;
	private commands: LintCommand[];

	public constructor(context: vscode.ExtensionContext) {
		this.settings = <Settings>vscode.workspace.getConfiguration('ruby');
		this.debouncedLint = _.debounce(this.lintDocument, this.settings.lintDebounceTime);

		// setup linting commands
		this.commands = [ new RuboCop(this.settings) ];

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
		this.commands.forEach((command: LintCommand) => command.run(document));
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

	private onDidChangeConfiguration = () => {
		// REMIND: apply new settings, then lint
		console.log('onDidChangeConfiguration');
	};

}

// LintCollection - houses the three different linters
//   .results - LintResult (results for ALL files), per linter
//   .docLinters - Linter (three different linters), per file

// {
//   map from linter_name => LintResults
//   "_results": {
//     "rubocop": {
//       "_fileDiagnostics": { ... }
//     }
//
//   map from filename => Linter
//   "_docLinters": {
//     "\/Users\/amd\/spoonpro\/test\/controllers\/profiles_controller_test.rb": {
//       "doc": { ... }
//       "rootPath": "\/Users\/amd\/spoonpro",
//       "linting": {
//         "rubocop": {
//           "pend": false,
//           "active": true
//         }
//       },
//
//       config
//       "cfg": {
//         "rubocop": {
//           "pathToRuby": "ruby",
//           "pathToBundler": "bundle",
//           "useBundler": false
//         }
//       }
//     }
//   },
//
//   top level config
//   "_globalConfig": {
//     "pathToRuby": "ruby",
//     "pathToBundler": "bundle",
//     "useBundler": false
//   },
//   "_cfg": {
//     "rubocop": {
//       "pathToRuby": "ruby",
//       "pathToBundler": "bundle",
//       "useBundler": false
//     }
//   },
//   "_rootPath": "\/Users\/amd\/spoonpro"
// }
