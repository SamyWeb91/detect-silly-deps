#!/usr/bin/env node
'use strict';

/**
 * Librería CLI para detectar dependencias triviales ("silly deps")
 * Mejorada con nuevas funciones, mejor rendimiento y más opciones CLI.
 */

// =========================
//   IMPORTS Y CONFIG
// =========================
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Carga perezosa de algunos módulos pesados
let Table;
let readline;

// Configuración de rutas
const LIB_DIR = path.join(__dirname, 'lib');
const LOCALES_DIR = path.join(__dirname, 'locales');
const DB_PATH = path.join(__dirname, 'silly-db.json');
const HISTORY_FILE = path.join(__dirname, '.silly-history.json');
const CACHE_FILE = path.join(os.tmpdir(), 'silly-cache.json');

// =========================
//   COLORES Y I18N
// =========================
let colors;
try {
  colors = require(path.join(LIB_DIR, 'colors'));
} catch (error) {
  console.error('✖ Error cargando colores:', error.message);
  process.exit(1);
}

const i18n = require('i18n');
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

// =========================
//   CARGA DE BASE DE DATOS
// =========================
let sillyList = {};
try {
  sillyList = require(DB_PATH);
  if (!sillyList || typeof sillyList !== 'object') {
    throw new Error('Estructura de base de datos inválida');
  }
} catch (error) {
  console.error(`${colors.red}✖ Error cargando la base de datos: ${error.message}${colors.reset}`);
  process.exit(1);
}

// =========================
//   FUNCIONES AUXILIARES
// =========================
const readFile = (file) => fs.promises.readFile(file, 'utf-8').catch(() => null);

function saveHistory(results) {
  try {
    const history = fs.existsSync(HISTORY_FILE) ? JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')) : [];
    history.push({
      date: new Date().toISOString(),
      summary: {
        direct: results.direct.count,
        indirect: results.indirect.count
      }
    });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error(`${colors.red}✖ Error guardando historial: ${e.message}${colors.reset}`);
  }
}

function getSizeOnDisk(pathName) {
  try {
    const output = execSync(`du -sh "${pathName}" | cut -f1`).toString().trim();
    return output;
  } catch {
    return 'N/A';
  }
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch {}
  return null;
}

function saveCache(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch {}
}

// =========================
//   DEPENDENCIAS
// =========================
async function getAllDependencies(pkgPath) {
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
        indirectDeps.push({
          name,
          parent: parent || 'root',
          version: pkg.version,
          resolved: pkg.resolved
        });
      }
      if (pkg.dependencies) traverse(pkg.dependencies, name);
    });
  };
  traverse(depTree.dependencies);

  return { direct: directDeps, indirect: indirectDeps };
}

function analyzeDependencies(deps, categoryFilter = null) {
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
        if (!categoryFilter || categoryFilter === category) {
          results[type].count++;
          results[type].packages.push(depName);
          results.byCategory[category].push({
            name: depName,
            solution: items[depName],
            type,
            ...(parent && { via: parent })
          });
        }
        found = true;
        break;
      }
    }
    if (!found && depName.length <= 12 && (!categoryFilter || categoryFilter === 'other')) {
      results.byCategory.other.push({
        name: depName,
        solution: i18n.__('checkIfNeeded'),
        type,
        ...(parent && { via: parent })
      });
    }
  };

  deps.direct.forEach(dep => analyzeDep(dep, 'direct'));
  deps.indirect.forEach(dep => analyzeDep(dep, 'indirect', dep.parent));

  return results;
}

// =========================
//   IMPRESIÓN DE RESULTADOS
// =========================
function printResults(results, options = {}) {
  const { verbose = false, showAll = false, noColor = false } = options;
  let c = noColor ? { red: '', green: '', yellow: '', cyan: '', magenta: '', blue: '', reset: '' } : colors;

  const output = [];
  output.push(`${c.cyan}=== ${i18n.__('summary.title')} ===${c.reset}`);
  output.push(`${i18n.__('summary.direct')}: ${results.direct.count}`);
  output.push(`${i18n.__('summary.indirect')}: ${results.indirect.count}\n`);

  Object.entries(results.byCategory).forEach(([category, items]) => {
    if (items.length > 0) {
      output.push(`${c.yellow}${category.toUpperCase()} (${items.length})${c.reset}`);
      items.forEach(item => {
        output.push(`- ${item.name}: ${c.green}${item.solution}${c.reset}`);
        if (item.type === 'indirect') {
          output.push(`  ${c.magenta}(${i18n.__('includedBy')}: ${item.via})${c.reset}`);
        }
        if (verbose) {
          const typeText = item.type === 'direct'
            ? c.blue + i18n.__('type.direct')
            : c.magenta + i18n.__('type.indirect');
          output.push(`  ${i18n.__('type')}: ${typeText}${c.reset}`);
        }
      });
      output.push('');
    }
  });

  console.log(output.join('\n'));
}

// =========================
//   CLI PRINCIPAL
// =========================
async function runCLI() {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    stats: args.includes('--stats') || args.includes('-s'),
    category: args.find(arg => arg.startsWith('--category='))?.split('=')[1] || null,
    noColor: args.includes('--no-color'),
    outFile: args.find(arg => arg.startsWith('--out='))?.split('=')[1] || null
  };

  if (args.find(arg => arg.startsWith('--lang='))) {
    const lang = args.find(arg => arg.startsWith('--lang=')).split('=')[1];
    if (['en', 'es'].includes(lang)) i18n.setLocale(lang);
  } else {
    i18n.setLocale(os.locale()?.startsWith('es') ? 'es' : 'en');
  }

  const pkgPath = path.resolve(process.cwd(), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error(`${colors.red}✖ ${i18n.__('errors.noPackage')}${colors.reset}`);
    process.exit(1);
  }

  const deps = await getAllDependencies(pkgPath);
  const results = analyzeDependencies(deps, options.category);

  saveHistory(results);
  saveCache(results);
  printResults(results, options);

  if (options.outFile) {
    fs.writeFileSync(options.outFile, JSON.stringify(results, null, 2));
    console.log(`${colors.green}✔ ${i18n.__('results.savedTo')} ${options.outFile}${colors.reset}`);
  }
}

// =========================
//   EJECUCIÓN
// =========================
if (require.main === module) {
  runCLI().catch(error => {
    console.error(`${colors.red}✖ Error crítico: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  getAllDependencies,
  analyzeDependencies,
  printResults
};
