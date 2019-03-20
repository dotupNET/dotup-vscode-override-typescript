import { FileAnalyser, SourceFileDescriptor, SourceAnalyser } from 'dotup-vscode-api-extensions';
import * as fs from 'fs';
import * as path from 'path';
import { ImportDeclaration, MethodSignature, NamedImports, SyntaxKind, TypeReferenceNode } from 'typescript';
import * as vscode from 'vscode';

export class MethodExtractor {

	constructor() {
	}

	// async getExtendedFile(): void {

	// }
	async getMethodSignatures(document: vscode.TextDocument, position: vscode.Position, out: vscode.OutputChannel): Promise<MethodSignature[]> {
		const sourceFilePath = document.uri.fsPath;

		// Analyse source file
		// const fileAnalyser = new FileAnalyser();
		// const sourceDescriptor = fileAnalyser.analyseFile(sourceFilePath, out);

		const analyser = new SourceAnalyser();
		// tslint:disable-next-line: non-literal-fs-path

		const sourceDescriptor = analyser.analyse('tmp', document.getText());
		//	const curserPos = vscode.window.activeTextEditor.selection.start;

		// Is there a valid source file?
		if (sourceDescriptor.isSourceValid()) {

			const classToOverrideFrom = sourceDescriptor.classDescriptors.find(descriptor => {
				const cd = descriptor.classDeclaration;
				const lineAndCharacterPos = cd.getSourceFile().getLineAndCharacterOfPosition(cd.name.pos);
				const lineAndCharacterEnd = cd.getSourceFile().getLineAndCharacterOfPosition(cd.end);
				return (position.line > lineAndCharacterPos.line && position.line < lineAndCharacterEnd.line);
			});

			// We are not in a class declaration
			if (classToOverrideFrom === undefined) {
				return;
			}

			const clause = classToOverrideFrom.classDeclaration.heritageClauses.find(x => x.token === SyntaxKind.ExtendsKeyword);

			// Class does not extend anything
			if (clause === undefined) {
				return;
			}

			const className = clause.types[0].getText();
			const importDeclaration = this.getImportDeclaration(sourceDescriptor, className);

			// File has no import statements
			if (importDeclaration === undefined) {
				return;
			}

			const classToExtendFromSourceFile = this.getClassToExtendFrom(path.dirname(sourceFilePath), importDeclaration, out);


			// Class declaration file not found
			if (classToExtendFromSourceFile === undefined) {
				return;
			}

			const classToExtendFrom = classToExtendFromSourceFile.classDescriptors.find(c => c.className === className);

			// Class declaration not found
			if (classToExtendFrom === undefined) {
				return;
			}

			return classToExtendFrom.methods;
		}
	}

	getImportDeclaration(sourceDescriptor: SourceFileDescriptor, className: string): ImportDeclaration {
		const extendsSource = sourceDescriptor.importClause.find(imp => {
			const x: ImportDeclaration = <ImportDeclaration>imp;
			const bindings = <NamedImports>x.importClause.namedBindings;

			return bindings.elements.some(x => x.name.getText() === className);
		});

		return <ImportDeclaration>extendsSource;
	}

	getClassToExtendFrom(rootPath: string, importDeclaration: ImportDeclaration, out: vscode.OutputChannel): SourceFileDescriptor {
		let src = importDeclaration.moduleSpecifier.getText();
		src = src.replace(/'|"/g, '');
		src = `${src}.ts`;

		const sourceFilePath = path.join(rootPath, src);

		if (fs.existsSync(sourceFilePath)) {
			const fileAnalyser = new FileAnalyser();
			const sourceDescriptor = fileAnalyser.analyseFile(sourceFilePath, out);

			return sourceDescriptor;
		}
	}

	isAsyncMethod(method: MethodSignature): boolean {
		if (method.type === undefined) {
			return false;
		}

		switch (method.type.kind) {
			case SyntaxKind.TypeReference:
				return (<TypeReferenceNode>method.type).typeName.getText() === 'Promise';

			default:
				return false;
		}

	}
	
}

