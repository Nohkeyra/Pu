/**
 * Read-only static ESM dependency audit. Runs in existing test:migrations CI.
 * Enforces the verified acyclic runtime-static baseline.
 * Type-only declarations, lazy import(), nonliteral imports and npm packages are
 * deliberately outside this runtime-static graph. A cycle is a review candidate,
 * not proof of an initialization failure.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function staticSpecifiers(source, filename = 'fixture.ts') {
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const result = [];
  for (const node of ast.statements) {
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly &&
        ts.isStringLiteralLike(node.moduleSpecifier)) {
      result.push(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node) && !node.isTypeOnly &&
        node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      result.push(node.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly &&
        ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) {
      result.push(node.moduleReference.expression.text);
    }
  }
  return result;
}

function findCycles(graph) {
  let nextIndex = 0;
  const indices = new Map(), low = new Map(), onStack = new Set(), stack = [], cycles = [];
  function visit(vertex) {
    indices.set(vertex, nextIndex);
    low.set(vertex, nextIndex++);
    stack.push(vertex);
    onStack.add(vertex);
    for (const target of graph.get(vertex) || []) {
      if (!graph.has(target)) continue;
      if (!indices.has(target)) {
        visit(target);
        low.set(vertex, Math.min(low.get(vertex), low.get(target)));
      } else if (onStack.has(target)) {
        low.set(vertex, Math.min(low.get(vertex), indices.get(target)));
      }
    }
    if (low.get(vertex) !== indices.get(vertex)) return;
    const component = [];
    let current;
    do {
      current = stack.pop();
      onStack.delete(current);
      component.push(current);
    } while (current !== vertex);
    if (component.length > 1 || graph.get(vertex).has(vertex)) cycles.push(component.sort());
  }
  for (const vertex of [...graph.keys()].sort()) {
    if (!indices.has(vertex)) visit(vertex);
  }
  return cycles.sort((a, b) => a[0].localeCompare(b[0]));
}

function config(root, name) {
  const file = path.join(root, name);
  const read = ts.readConfigFile(file, ts.sys.readFile);
  if (read.error) throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, root, undefined, file);
  if (parsed.errors.length) {
    throw new Error(parsed.errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n')).join('\n'));
  }
  return parsed;
}

function auditRepository(root) {
  const app = config(root, 'tsconfig.app.json');
  const server = config(root, 'tsconfig.node.json');
  const relative = file => path.relative(root, file).split(path.sep).join('/');
  const inScope = file => {
    const rel = relative(file);
    return (/^(src|server)\//.test(rel) || rel === 'server.ts') &&
      /\.[cm]?tsx?$/.test(rel) && !/\.(?:d|test|spec)\.[cm]?tsx?$/.test(rel);
  };
  const files = [...new Set([...app.fileNames, ...server.fileNames].map(file => path.resolve(file)))]
    .filter(inScope).sort();
  const graph = new Map(files.map(file => [relative(file), new Set()]));
  const unresolved = [];
  for (const file of files) {
    const from = relative(file);
    const options = from.startsWith('src/') ? app.options : server.options;
    for (const specifier of staticSpecifiers(fs.readFileSync(file, 'utf8'), file)) {
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) continue;
      // Styles, images and JSON are not executable ESM source nodes.
      if (/\.(?:css|scss|svg|png|jpg|jpeg|webp|gif|json|woff2?|ttf)(?:[?#].*)?$/i.test(specifier)) continue;
      const result = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule;
      const to = result && relative(path.resolve(result.resolvedFileName));
      if (to && graph.has(to)) graph.get(from).add(to);
      else if (!result) unresolved.push({ from, specifier });
    }
  }
  return {
    files: graph.size,
    edges: [...graph.values()].reduce((sum, edges) => sum + edges.size, 0),
    cycles: findCycles(graph),
    unresolved,
  };
}

test('static import extraction excludes explicit type-only declarations and lazy imports', () => {
  assert.deepEqual(staticSpecifiers(`
    import type { T } from './type';
    import { value } from './runtime';
    import './side-effect';
    export type { X } from './type-export';
    export { thing } from './re-export';
    const lazy = () => import('./lazy');
  `), ['./runtime', './side-effect', './re-export']);
});

test('cycle detection handles independent components, self-imports and acyclic edges', () => {
  const graph = new Map([
    ['a', new Set(['b'])], ['b', new Set(['a', 'c'])], ['c', new Set()],
    ['d', new Set(['d'])], ['e', new Set(['f'])], ['f', new Set(['g'])],
    ['g', new Set(['e'])],
  ]);
  assert.deepEqual(findCycles(graph), [['a', 'b'], ['d'], ['e', 'f', 'g']]);
});

test('Wawasan static ESM graph remains acyclic and resolves local imports', () => {
  const result = auditRepository(path.resolve(__dirname, '..'));
  assert.ok(result.files > 0, 'Expected real repository source modules');
  assert.ok(result.edges > 0, 'Expected resolved local imports');
  console.log('DEPENDENCY_AUDIT ' + JSON.stringify(result, null, 2));
  assert.deepEqual(result.cycles, [], 'New static runtime cycle detected');
  assert.deepEqual(result.unresolved, [], 'Unresolved local runtime import detected');
});
