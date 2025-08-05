//!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const i18n = require('i18n');

const LIB_DIR = path.join(__dirname, 'lib');
const LOCALES_DIR = path.join(__dirname, 'locales');
const DB_PATH = path.join(__dirname, 'silly-db.json');

let colors;
try {
  colors = require(path.join(LIB_DIR, 'colors'));
} catch (error) {
  console.error('✖ Error cargando colores:', error.message);
  process.exit(1);
}

try {
  i18n.configure({
    locales: ['en', 'es'],
    directory: LOCALES_DIR,
    defaultLocale: 'en',
    register: global,
    objectNotation: true,
    updateFiles: false,
    syncFiles: false
  });
} catch (error) {
  console.error(`${colors.red}✖ Error configurando i18n: ${error.message}${colors.reset}`);
  process.exit(1);
}

let sillyList = {};
try {
  sillyList = require(DB_PATH);
} catch (error) {
  console.error(`${colors.red}✖ Error cargando la base de datos: ${error.message}${colors.reset}`);
  process.exit(1);
}

function validateDatabase(db) {
  if (!db || typeof db !== 'object') {
    throw new Error('Estructura de base de datos inválida');
  }
  return db;
}
sillyList = validateDatabase(sillyList);

async function getAllDependencies(pkgPath) {
  const readFile = (file) => fs.promises.readFile(file, 'utf-8').catch(() => null);
  try {
    const pkgContent = await readFile(pkgPath);
    if (!pkgContent) throw new Error('No se pudo leer package.json');
    const pkg = JSON.parse(pkgContent);
    const directDeps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {})
    ];
    let depTree;
    try {
      const npmLsOutput = execSync('npm ls --json --all --silent', { stdio: 'pipe' }).toString();
      depTree = JSON.parse(npmLsOutput);
    } catch {
      depTree = { dependencies: {} };
    }
    const indirectDeps = [];
    const traverse = (deps, parent) => {
      if (!deps) return;
      Object.entries(deps).forEach(([name, pkg]) => {
        if (!directDeps.includes(name) && !indirectDeps.some(d => d.name === name)) {
          indirectDeps.push({ name, parent: parent || 'root', version: pkg.version, resolved: pkg.resolved });
        }
        if (pkg.dependencies) traverse(pkg.dependencies, name);
      });
    };
    traverse(depTree.dependencies);
    return { direct: directDeps, indirect: indirectDeps };
  } catch (error) {
    console.error(`${colors.red}✖ Error obteniendo dependencias: ${error.message}${colors.reset}`);
    return { direct: [], indirect: [] };
  }
}

function analyzeDependencies(deps) {
  const results = {
    direct: { count: 0, packages: [] },
    indirect: { count: 0, packages: [] },
    byCategory: {}
  };
  Object.keys(sillyList).forEach(category => {
    results.byCategory[category] = [];
  });
  results.byCategory.other = [];
  const analyzeDep = (dep, type, parent = null) => {
    const depName = typeof dep === 'string' ? dep : dep.name;
    let found = false;
    for (const [category, items] of Object.entries(sillyList)) {
      if (items[depName]) {
        results[type].count++;
        results[type].packages.push(depName);
        results.byCategory[category].push({ name: depName, solution: items[depName], type, ...(parent && { via: parent }) });
        found = true;
        break;
      }
    }
    if (!found && depName.length <= 12) {
      results.byCategory.other.push({ name: depName, solution: i18n.__('checkIfNeeded'), type, ...(parent && { via: parent }) });
    }
  };
  deps.direct.forEach(dep => analyzeDep(dep, 'direct'));
  deps.indirect.forEach(dep => analyzeDep(dep, 'indirect', dep.parent));
  return results;
}

function printResults(results, options = {}) {
  const { verbose = false, showAll = false } = options;
  const output = [];
  let hasSillyDeps = false;
  output.push(`${colors.cyan}=== ${i18n.__('summary.title')} ===${colors.reset}`);
  output.push(`${i18n.__('summary.direct')}: ${results.direct.count}`);
  output.push(`${i18n.__('summary.indirect')}: ${results.indirect.count}\n`);
  Object.entries(results.byCategory).forEach(([category, items]) => {
    if (items.length > 0) {
      hasSillyDeps = true;
      output.push(`${colors.yellow}${category.toUpperCase()} (${items.length})${colors.reset}`);
      items.forEach(item => {
        output.push(`- ${item.name}: ${colors.green}${item.solution}${colors.reset}`);
        if (item.type === 'indirect') {
          output.push(`  ${colors.magenta}(${i18n.__('includedBy')}: ${item.via})${colors.reset}`);
        }
        if (verbose) {
          const typeText = item.type === 'direct' ? colors.blue + i18n.__('type.direct') : colors.magenta + i18n.__('type.indirect');
          output.push(`  ${i18n.__('type')}: ${typeText}${colors.reset}`);
        }
      });
      output.push('');
    }
  });
  if (!hasSillyDeps) {
    output.push(`${colors.green}✔ ${i18n.__('noSillyDeps')}${colors.reset}`);
  }
  console.log(output.join('\n'));
  return hasSillyDeps;
}

async function audit(options = {}) {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (!fs.existsSync(pkgPath)) throw new Error(i18n.__('errors.noPackage'));
    const deps = await getAllDependencies(pkgPath);
    const results = analyzeDependencies(deps);
    if (options.returnData) return results;
    const found = printResults(results, { verbose: options.verbose, showAll: options.stats });
    return { found, results, packagePath: pkgPath };
  } catch (error) {
    console.error(`${colors.red}✖ ${i18n.__('errors.generic')}: ${error.message}${colors.reset}`);
    return { error: error.message };
  }
}

function findPackagePathInLock(name, lockTree, currentPath = 'node_modules') {
  if (!lockTree.dependencies) return null;
  for (const [depName, depInfo] of Object.entries(lockTree.dependencies)) {
    const fullPath = path.join(currentPath, depName);
    if (depName === name) return fullPath;
    const sub = findPackagePathInLock(name, depInfo, fullPath);
    if (sub) return sub;
  }
  return null;
}

async function runAudit(options = {}) {
  const result = await audit(options);
  if (options.showPaths && result?.results) {
    const pkgLockPath = path.resolve(process.cwd(), 'package-lock.json');
    if (fs.existsSync(pkgLockPath)) {
      const pkgLock = JSON.parse(fs.readFileSync(pkgLockPath, 'utf-8'));
      console.log(`\n${colors.cyan}${i18n.__('audit.paths') || 'Rutas de paquetes triviales:'}${colors.reset}`);
      for (const category of Object.keys(result.results.byCategory)) {
        for (const pkg of result.results.byCategory[category]) {
          const foundPath = findPackagePathInLock(pkg.name, pkgLock);
          if (foundPath) {
            console.log(`${colors.green}${pkg.name}${colors.reset} -> ${foundPath}`);
          }
        }
      }
    } else {
      console.log(`${colors.red}⚠ ${i18n.__('errors.noLockfile') || 'package-lock.json no encontrado'}${colors.reset}`);
    }
  }
}

async function explainWhy(pkgName) {
  if (!pkgName) {
    console.log(`${colors.red}✖ Debes especificar un paquete${colors.reset}`);
    return;
  }
  const data = execSync(`npm view ${pkgName} --json`, { stdio: 'pipe' }).toString();
  const pkgStats = JSON.parse(data);
  const suggestion = suggestAlternative(pkgName);
  if (suggestion.isSilly) {
    console.log(`${colors.yellow}${pkgName}${colors.reset} es trivial.`);
    console.log(`Categoría: ${suggestion.category}`);
    console.log(`Alternativa: ${colors.green}${suggestion.alternative}${colors.reset}`);
  } else {
    console.log(`${pkgName} no es considerado trivial.`);
  }
}

function suggestAlternative(pkgName) {
  for (const [category, items] of Object.entries(sillyList)) {
    if (items[pkgName]) {
      return { category, alternative: items[pkgName], isSilly: true };
    }
  }
  return { isSilly: false };
}

function listTrivialPackages() {
  console.log(`${colors.cyan}=== Lista de dependencias triviales ===${colors.reset}`);
  for (const [category, pkgs] of Object.entries(sillyList)) {
    console.log(`${colors.yellow}${category.toUpperCase()}${colors.reset}`);
    for (const [pkg, suggestion] of Object.entries(pkgs)) {
      console.log(`- ${pkg} → ${colors.green}${suggestion}${colors.reset}`);
    }
  }
}

async function uninstallAllFlow(options) {
  const result = await audit({ returnData: true });
  await uninstallAllDependencies(result, options);
}

async function uninstallAllDependencies(results, options = {}) {
  const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  const question = (query) => new Promise(resolve => readline.question(query, ans => resolve(ans.toLowerCase())));

  if (!results.direct.packages.length) {
    console.log(`${colors.green}✔ No hay dependencias para eliminar${colors.reset}`);
    readline.close();
    return;
  }

  console.log(`${colors.yellow}⚠ Se eliminarán: ${colors.reset}${results.direct.packages.join(', ')}`);
  const answer = await question('¿Continuar? (y/N) ');
  if (answer !== 'y' && answer !== 'yes') {
    console.log(colors.cyan + 'Cancelado.' + colors.reset);
    readline.close();
    return;
  }

  const prodDeps = results.direct.packages;
  if (prodDeps.length > 0) {
    console.log(`${colors.magenta}→ Eliminando...${colors.reset}`);
    execSync(`npm uninstall ${prodDeps.join(' ')}`, { stdio: 'inherit' });
  }
  console.log(`${colors.green}✔ Completado.${colors.reset}`);
  readline.close();
}

async function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0];
  const flags = args.slice(1);
  const options = {
    verbose: flags.includes('--verbose') || flags.includes('-v'),
    stats: flags.includes('--stats') || flags.includes('-s'),
    lang: flags.find(arg => arg.startsWith('--lang='))?.split('=')[1],
    returnData: flags.includes('--json'),
    showPaths: flags.includes('--paths')
  };
  if (options.lang && ['en', 'es'].includes(options.lang)) {
    i18n.setLocale(options.lang);
  }
  switch (command) {
    case 'audit': return await runAudit(options);
    case 'audit-path': return await runAudit({ ...options, showPaths: true });
    case 'why': return await explainWhy(flags[0]);
    case 'uninstall-all': return await uninstallAllFlow(options);
    case 'list': return listTrivialPackages();
    default:
      console.log(`${colors.yellow}⚠ Comando no reconocido: ${command}${colors.reset}`);
      console.log(`Comandos disponibles: audit, audit-path, why <pkg>, uninstall-all, list`);
  }
}

if (require.main === module) {
  runCLI().catch(error => {
    console.error(`${colors.red}✖ Error crítico: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  audit,
  analyzeDependencies,
  getAllDependencies,
  suggestAlternative,
  uninstallAllDependencies
};
