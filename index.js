#!/usr/bin/env node
'use strict';
// Importaciones con manejo de errores mejorado
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const i18n = require('i18n');
// ConfiguraciÃ³n de rutas seguras
const LIB_DIR = path.join(__dirname, 'lib');
const LOCALES_DIR = path.join(__dirname, 'locales');
const DB_PATH = path.join(__dirname, 'silly-db.json');

// Manejo mejorado de errores para imports
let colors;
try {
  colors = require(path.join(LIB_DIR, 'colors'));
} catch (error) {
  console.error('âŒ  Error cargando colores:', error.message);
  process.exit(1);
}

// ConfiguraciÃ³n mejorada de i18n
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
  console.error(`${colors.red}âŒ  Error configurando i18n: ${error.message}${colors.reset}`);
  process.exit(1);
}

// Carga segura de la base de datos
let sillyList = {};
try {
  sillyList = require(DB_PATH);
} catch (error) {
  console.error(`${colors.red}âŒ  Error cargando la base de datos: ${error.message}${colors.reset}`);
  process.exit(1);
}

// ValidaciÃ³n de estructura de datos
function validateDatabase(db) {
  if (!db || typeof db !== 'object') {
    throw new Error('Estructura de base de datos invÃ¡lida');
  }
  return db;
}
sillyList = validateDatabase(sillyList);

// FunciÃ³n mejorada para obtener dependencias
async function getAllDependencies(pkgPath) {
  const readFile = (file) => fs.promises.readFile(file, 'utf-8').catch(() => null);
  try {
    const pkgContent = await readFile(pkgPath);
    if (!pkgContent) {
      throw new Error('No se pudo leer package.json');
    }
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
  } catch (error) {
    console.error(`${colors.red}âŒ  Error obteniendo dependencias: ${error.message}${colors.reset}`);
    return { direct: [], indirect: [] };
  }
}

// Analizador mejorado de dependencias
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
        results.byCategory[category].push({
          name: depName,
          solution: items[depName],
          type,
          ...(parent && { via: parent })
        });
        found = true;
        break;
      }
    }
    if (!found && depName.length <= 12) {
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

// FunciÃ³n mejorada para mostrar resultados
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
          const typeText = item.type === 'direct'
            ? colors.blue + i18n.__('type.direct')
            : colors.magenta + i18n.__('type.indirect');
          output.push(`  ${i18n.__('type')}: ${typeText}${colors.reset}`);
        }
      });
      output.push('');
    }
  });

  if (!hasSillyDeps) {
    output.push(`${colors.green}âœ“ ${i18n.__('noSillyDeps')}${colors.reset}`);
  } else {
    const getDevDeps = () => {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));
        return results.direct.packages.filter(dep => pkg.devDependencies?.[dep]);
      } catch {
        return [];
      }
    };
    const prodDeps = results.direct.packages;
    const devDeps = getDevDeps();
    
    if (prodDeps.length > 0) {
      output.push(`${colors.magenta}â†’ ${i18n.__('remove.prod')}:${colors.reset}`);
      output.push(`   npm uninstall ${prodDeps.join(' ')}`);
    }
    if (devDeps.length > 0) {
      output.push(`${colors.magenta}â†’ ${i18n.__('remove.dev')}:${colors.reset}`);
      output.push(`   npm uninstall -D ${devDeps.join(' ')}`);
    }
    if (showAll) {
      output.push(`\n${colors.cyan}=== ${i18n.__('stats.title')} ===${colors.reset}`);
      output.push(`${i18n.__('stats.total')}: ${results.direct.count + results.indirect.count}`);
      output.push(`${i18n.__('stats.space')}: ${Math.round((results.direct.count + results.indirect.count) * 0.5)}MB`);
    }
  }
  console.log(output.join('\n'));
  return hasSillyDeps;
}

// AuditorÃ­a principal mejorada
async function audit(options = {}) {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (!fs.existsSync(pkgPath)) {
      throw new Error(i18n.__('errors.noPackage'));
    }
    const deps = await getAllDependencies(pkgPath);
    const results = analyzeDependencies(deps);
    if (options.returnData) {
      return results;
    }
    const found = printResults(results, {
      verbose: options.verbose,
      showAll: options.stats
    });
    return {
      found,
      results,
      packagePath: pkgPath
    };
  } catch (error) {
    console.error(`${colors.red}âŒ  ${i18n.__('errors.generic')}: ${error.message}${colors.reset}`);
    return { error: error.message };
  }
}

// Funcionalidades adicionales mejoradas
async function getPackageStats(pkgName) {
  try {
    const data = execSync(`npm view ${pkgName} --json`, { stdio: 'pipe', timeout: 5000 }).toString();
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function suggestAlternative(pkgName) {
  for (const [category, items] of Object.entries(sillyList)) {
    if (items[pkgName]) {
      return {
        category,
        alternative: items[pkgName],
        isSilly: true
      };
    }
  }
  return { isSilly: false };
}

// FunciÃ³n para desinstalar todas las dependencias con confirmaciÃ³n
async function uninstallAllDependencies(results, options = {}) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise(resolve => {
    readline.question(query, answer => resolve(answer.toLowerCase()));
  });

  try {
    if (!results.direct.packages.length) {
      console.log(`${colors.green}âœ“ ${i18n.__('noDepsToRemove')}${colors.reset}`);
      return;
    }

    console.log('\n' + colors.yellow + i18n.__('uninstall.warning') + colors.reset);
    console.log(i18n.__('uninstall.list') + ': ' + colors.red + results.direct.packages.join(', ') + colors.reset);

    const answer = await question(i18n.__('uninstall.confirm') + ' (y/N) ');
    if (answer !== 'y' && answer !== 'yes') {
      console.log(colors.cyan + i18n.__('uninstall.cancelled') + colors.reset);
      return;
    }

    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const prodDeps = [];
    const devDeps = [];

    results.direct.packages.forEach(dep => {
      if (pkg.devDependencies?.[dep]) {
        devDeps.push(dep);
      } else if (pkg.dependencies?.[dep]) {
        prodDeps.push(dep);
      }
    });

    if (prodDeps.length > 0) {
      console.log('\n' + colors.magenta + i18n.__('uninstall.removingProd') + colors.reset);
      execSync(`npm uninstall ${prodDeps.join(' ')}`, { stdio: 'inherit' });
    }

    if (devDeps.length > 0) {
      console.log('\n' + colors.magenta + i18n.__('uninstall.removingDev') + colors.reset);
      execSync(`npm uninstall -D ${devDeps.join(' ')}`, { stdio: 'inherit' });
    }

    console.log('\n' + colors.green + 'âœ“ ' + i18n.__('uninstall.complete') + colors.reset);
  } catch (error) {
    console.error('\n' + colors.red + 'âŒ ' + i18n.__('errors.uninstallFailed') + ': ' + error.message + colors.reset);
  } finally {
    readline.close();
  }
}

// CLI mejorada
async function runCLI() {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    stats: args.includes('--stats') || args.includes('-s'),
    fix: args.includes('--fix'),
    why: args.includes('--why') ? args[args.indexOf('--why') + 1] : null,
    lang: args.find(arg => arg.startsWith('--lang='))?.split('=')[1],
    returnData: args.includes('--json'),
    uninstallAll: args.includes('--uninstall-all')
  };

  if (options.lang && ['en', 'es'].includes(options.lang)) {
    i18n.setLocale(options.lang);
  }

  if (options.why) {
    const pkgStats = await getPackageStats(options.why);
    if (pkgStats) {
      const suggestion = suggestAlternative(options.why);
      if (suggestion.isSilly) {
        console.log(`${colors.yellow}${options.why}${colors.reset} ${i18n.__('why.isSilly')}`);
        console.log(`${i18n.__('why.category')}: ${suggestion.category}`);
        console.log(`${i18n.__('why.alternative')}: ${colors.green}${suggestion.alternative}${colors.reset}`);
        console.log(`${i18n.__('why.downloads')}: ${pkgStats.downloads?.toLocaleString() || 'N/A'}`);
      } else {
        console.log(`${options.why} ${i18n.__('why.notSilly')}`);
      }
    } else {
      console.log(`${colors.red}${i18n.__('errors.noPackageInfo')} ${options.why}${colors.reset}`);
    }
    return;
  }

  const result = await audit(options);
  
  if (options.uninstallAll) {
    await uninstallAllDependencies(result.results, options);
    return;
  }

  if (options.fix && result.found) {
    console.log(`${colors.cyan}\nâ†’ ${i18n.__('fix.applying')}...${colors.reset}`);
    try {
      const pkg = JSON.parse(fs.readFileSync(result.packagePath, 'utf-8'));
      result.results.direct.packages.forEach(dep => {
        if (pkg.dependencies?.[dep]) {
          console.log(`${i18n.__('fix.removingProd')} ${dep}...`);
          delete pkg.dependencies[dep];
        }
        if (pkg.devDependencies?.[dep]) {
          console.log(`${i18n.__('fix.removingDev')} ${dep}...`);
          delete pkg.devDependencies[dep];
        }
      });
      fs.writeFileSync(result.packagePath, JSON.stringify(pkg, null, 2));
      console.log(`${colors.green}âœ“ ${i18n.__('fix.complete')}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}âŒ  ${i18n.__('errors.fixFailed')}: ${error.message}${colors.reset}`);
    }
  }
}

// EjecuciÃ³n
if (require.main === module) {
  runCLI().catch(error => {
    console.error(`${colors.red}âŒ  Error crÃ­tico: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

// API pÃºblica mejorada
module.exports = {
  audit,
  analyzeDependencies,
  getAllDependencies,
  getPackageStats,
  suggestAlternative,
  printResults,
  uninstallAllDependencies,
  get colors() { return colors; },
  get sillyList() { return sillyList; }
};
