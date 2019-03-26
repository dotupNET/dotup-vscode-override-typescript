import { ClassDeclaration, Project } from "ts-morph";
import * as ts from "typescript";

export class TypeDefinitionAnalyser {
	classDeclarations: ClassDeclaration[];
	readonly className: string;
	methods: ts.MethodDeclaration[];

	constructor(className: string) {
		this.className = className;
		this.classDeclarations = [];
	}

	analyse(code: string): void {
		this.classDeclarations = [];
		this.methods = [];

		const project = new Project();
		const tmpSourceFile = project.createSourceFile('tmp', code);

		this.classDeclarations.push(...tmpSourceFile.getClasses());

		const nameSpaces = tmpSourceFile.getNamespaces();
		nameSpaces.forEach(ns=>{
			this.classDeclarations.push(... ns.getClasses());
		})

		const x = this.classDeclarations.find(x => x.getName() === this.className);

		if (x === undefined) {
			return;
		}

		this.methods = <any>x.getInstanceMethods();

	}

}
