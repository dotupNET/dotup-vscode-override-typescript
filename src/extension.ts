/*---------------------------------------------------------
 * Copyright (C) dotup IT solutions. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import { MethodExtractor } from './MethodExtractor';
import { NodePrinter } from 'dotup-vscode-api-extensions';
import { ExtendedNode } from 'dotup-vscode-api-extensions';
export function activate(context: vscode.ExtensionContext) {

	const out = vscode.window.createOutputChannel('override');
	out.clear();

	const methodExtractor = new MethodExtractor();

	let provider1 = vscode.languages.registerCompletionItemProvider('typescript', {

		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {

			const overrideCompletion = new vscode.CompletionItem('override');

			// return all completion items as array
			return [
				overrideCompletion
			];
		}
	});

	const provider2 = vscode.languages.registerCompletionItemProvider(
		'typescript',
		{
			async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				// get all text until the `position` and check if it reads `console.`
				// and iff so then complete if `log`, `warn`, and `error`
				let linePrefix = document.lineAt(position).text.substr(0, position.character).trim();
				if (!linePrefix.startsWith('override')) {
					return undefined;
				}

				const methods = await methodExtractor.getMethodSignatures(document, position, out);

				// no methods found
				if (methods === undefined) {
					return undefined;
				}

				return methods.map(m => {
					const completition = new vscode.CompletionItem('override.' + m.name.getText(), vscode.CompletionItemKind.Method)

					let text = NodePrinter.printNode(m);
					text = `${text.replace(';', '').trim()} {\n}`;
					text = methodExtractor.isAsyncMethod(m) ? `async ${text}` : text;
					completition.insertText = text;
					completition.range = new vscode.Range(new vscode.Position(position.line, position.character - 'override.'.length), position);
					completition.detail = text;
					completition.documentation = NodePrinter.printNode((<ExtendedNode>m).jsDoc);
					return completition;
				});

			}
		},
		'.' // triggered whenever a '.' is being typed
	);

	context.subscriptions.push(provider1, provider2);
}
