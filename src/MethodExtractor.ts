import { ClassAnalyer, SourceAnalyser, SourceFileDescriptor } from 'dotup-vscode-api-extensions';
import * as fs from 'fs';
import { ImportDeclaration, MethodSignature, NamedImports, SyntaxKind, TypeReferenceNode } from 'typescript';
import * as vscode from 'vscode';
import { FileFinder } from './FileFinder';
import { TypeDefinitionAnalyser } from './TypeDefinitionAnalyser';

export class MethodExtractor {

	constructor() {
	}

	// async getExtendedFile(): void {

	// }
	async getMethodSignatures(document: vscode.TextDocument, position: vscode.Position, out: vscode.OutputChannel): Promise<MethodSignature[]> {
		const analyser = new SourceAnalyser();
		const sourceDescriptor = analyser.analyse('tmp', document.getText());
		const className = this.getClassNameToOverrideFrom(sourceDescriptor, position);

		// Could not find class name
		if (className === undefined) {
			return;
		}

		const importDeclaration = this.getImportDeclaration(sourceDescriptor, className);

		// File has no import statements
		if (importDeclaration === undefined) {
			return;
		}

		const dts = new FileFinder();
		const definitionFilePath = dts.find(document.uri.fsPath, importDeclaration, className);
		const dtsContent = fs.readFileSync(definitionFilePath, 'UTF-8');

		// const sourceFile = createSourceFile('tmp', dtsContent, ScriptTarget.Latest, true);
		const ana = new TypeDefinitionAnalyser(className);
		ana.analyse(dtsContent);
		// const classToExtendFromSourceFile = this.getClassToExtendFrom(path.dirname(sourceFilePath), importDeclaration, out);
		// const classToExtendFromSourceFile = this.getClassToExtendFrom(definitionFilePath, importDeclaration, out);


		// // Class declaration file not found
		// if (classToExtendFromSourceFile === undefined) {
		// 	return;
		// }

		// const classToExtendFrom = classToExtendFromSourceFile.classDescriptors.find(c => c.className === className);

		// // Class declaration not found
		// if (classToExtendFrom === undefined) {
		// 	return;
		// }

		const ca = new ClassAnalyer();
		const cDec = ana.classDeclarations.find(x => x.getName() === className);
		const classDescriptor = ca.getClassDescriptor(cDec.compilerNode);
		return classDescriptor.methods;
	}

	getClassNameToOverrideFrom(sourceDescriptor: SourceFileDescriptor, position: vscode.Position): string {

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

			return clause.types[0].getText();
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

