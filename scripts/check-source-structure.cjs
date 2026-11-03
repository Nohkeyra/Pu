/**
 * Repository-local import and layout check.
 * npm run lint:structure (requires the project's TypeScript dev dependency).
 * This checks static string imports (including lazy import()) and component
 * placement, not runtime behavior, external packages, or dynamic path assembly.
 */
const fs = require('node:fs');
const path = require('node:path');
let ts;
try {
  ts = require('typescript');
} catch {
  console.error('TypeScript not installed. Run npm ci, then npm run lint:structure.');
  process.exit(2);
}
const root = path.resolve(__dirname, '..');
const errors = [];
const extensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.svg', '.webp', '.png'];
const sourceExts = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
let checkedFiles = 0;
let checkedLocalImports = 0;
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'server-dist', '.git'].includes(entry.name)) return [];
      return walk(path.join(dir, entry.name));
    }
    return entry.isFile() && sourceExts.test(entry.name) ? [path.join(dir, entry.name)] : [];
  });
}
function existsAsFile(candidate) {
  try { return fs.statSync(candidate).isFile(); }
  catch { return false; }
}
function resolves(importer, rawSpecifier) {
  const specifier = rawSpecifier.split(/[?#]/, 1)[0];
  const isAlias = specifier.startsWith('@/');
  if (!isAlias && !specifier.startsWith('./') && !specifier.startsWith('../')) return null;
  const initial = isAlias ? path.join(root, 'src', specifier.slice(2)) : path.resolve(path.dirname(importer), specifier);
  if (!initial.startsWith(root + path.sep)) return false;
  // Some build aliases intentionally point into dependencies that are absent before npm ci.
  if (initial.startsWith(path.join(root, 'node_modules') + path.sep)) return null;
  const candidates = [initial, ...extensions.map((ext) => initial + ext),
    ...extensions.map((ext) => path.join(initial, 'index' + ext))];
  if (initial.endsWith('.js')) candidates.push(initial.slice(0, -3) + '.ts', initial.slice(0, -3) + '.tsx');
  if (initial.endsWith('.mjs')) candidates.push(initial.slice(0, -4) + '.mts');
  if (initial.endsWith('.cjs')) candidates.push(initial.slice(0, -4) + '.cts');
  return candidates.some(existsAsFile);
}
for (const file of walk(root)) {
  checkedFiles++;
  const rel = path.relative(root, file).split(path.sep).join('/');
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (ast.parseDiagnostics.length) {
    errors.push(`${rel}: syntax parsing error`);
  }
  function check(node) {
    if (!node || !ts.isStringLiteralLike(node)) return;
    const outcome = resolves(file, node.text);
    if (outcome === null) return;
    checkedLocalImports++;
    if (!outcome) errors.push(`${rel}: unresolved ${node.text}`);
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) check(node.moduleSpecifier);
    else if (ts.isCallExpression(node) && node.arguments.length) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
         (ts.isIdentifier(node.expression) && node.expression.text === 'require') ||
         (ts.isPropertyAccessExpression(node.expression) && ['glob', 'resolve'].includes(node.expression.name.text))) {
        check(node.arguments[0]);
      }
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) check(node.argument.literal);
    else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL' && node.arguments?.length) check(node.arguments[0]);
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
const componentRoot = path.join(root, 'src', 'components');
const hookRoot = path.join(root, 'src', 'hooks');
for (const item of fs.readdirSync(componentRoot)) {
  if (/\.tsx?$/.test(item)) errors.push(`src/components/${item}: place component beside its feature or UI owner`);
}
for (const item of fs.readdirSync(hookRoot)) {
  if (/\.tsx?$/.test(item)) errors.push(`src/hooks/${item}: place hook in admin/delivery/native/ui`);
}
if (errors.length) {
  console.error(`FAIL: ${errors.length} structure issue(s):`);
  errors.forEach((err) => console.error(' - ' + err));
  process.exit(1);
}
console.log(`PASS: ${checkedFiles} source files parsed, ${checkedLocalImports} local imports resolved, grouped components/hooks verified.`);
