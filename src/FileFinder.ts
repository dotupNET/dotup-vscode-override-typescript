import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as resolve from 'resolve';

export class FileFinder {

	find(sourceDoumentPath: string, importDeclaration: ts.ImportDeclaration, className: string) {

		let moduleName = importDeclaration.moduleSpecifier.getText().replace(/'|"/g, '');

		// /, ./ or ../
		const isRelative = /\/|.\/|..\//g.test(importDeclaration.moduleSpecifier.getText());

		let result: string;
		if (isRelative) {
			const rootPath = path.dirname(sourceDoumentPath);
			result = this.findInProject(rootPath, moduleName);
		} else {
			const rootPath = vscode.workspace.workspaceFolders[0];
			result = this.findInNodeModules(rootPath.uri.fsPath, moduleName, className);
		}

		if (!fs.existsSync(result)) {
			throw new Error(`Could not find source file for module '${moduleName}'`);
		}
		return result;
	}

	findInProject(rootPath: string, moduleName: string) {
		const src = `${moduleName}.ts`;

		return path.join(rootPath, src);
	}

	findInNodeModules(rootPath: string, moduleName: string, className: string): string {
		const existingJsonFileContent = fs.readFileSync(path.join(rootPath, 'package.json'), 'utf-8');
		const existingJsonContent = JSON.parse(existingJsonFileContent);

		const deps = <string[]>existingJsonContent.devDependencies;
		const typedModuleName = `@types/${moduleName.replace(/'|"/g, '')}`;
		const r = Object.keys(deps).find(x => x === typedModuleName);
		if (r === undefined) {
			return this.findFromTypeFiles(rootPath, moduleName, className);
			// const resolved = resolve.sync(moduleName, {
			// 	paths: [path.join(rootPath, 'node_modules')]
			// });
			// return resolved.replace('.js', '.d.ts');
		} else {
			return path.join(rootPath, 'node_modules', typedModuleName, 'index.d.ts');
		}
	}

	findFromTypeFiles(rootPath: string, moduleName: string, className: string) {
		const resolved = resolve.sync(moduleName, {
			paths: [path.join(rootPath, 'node_modules')]
		});
		const dir = path.dirname(resolved);

		const namedFile = path.join(dir, `${className}.d.ts`);
		if (fs.existsSync(namedFile)) {
			return namedFile;
		} else {
			return resolved.replace('.js', '.d.ts');
		}
	}
}