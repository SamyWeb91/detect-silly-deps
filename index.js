#!/usr/bin/env node
'use strict';

// Importaciones básicas
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const colors = require('colors');

// Configuración de rutas
const DB_PATH = path.join(__dirname, 'silly-db.json');

// Carga de la base de datos de dependencias
let sillyList = {};
try {
  sillyList = require(DB_PATH);
} catch (error) {
  console.error(colors.red(`✖ Error cargando la base de datos: ${error.message}`));
  process.exit(1);
}

// Funciones mejoradas
async function getAllDependencies() {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    
    const directDeps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {})
    ];

    let depTree = { dependencies: {} };
    try {
      depTree = JSON.parse(execSync('npm ls --json --all --silent').toString());
    } catch {} // Ignorar errores de npm ls

    const indirectDeps = [];
    const traverse = (deps, parent) => {
      Object.entries(deps || {}).forEach(([name, pkg]) => {
        if (!directDeps.includes(name) && !indirectDeps.some(d => d.name === name)) {
          indirectDeps.push({ name, parent: parent || 'root', version: pkg.version });
        }
        traverse(pkg.dependencies, name);
      });
    };
    
    traverse(depTree.dependencies);
    return { direct: directDeps, indirect: indirectDeps };
  } catch (error) {
    console.error(colors.red(`✖ Error: ${error.message}`));
    process.exit(1);
  }
}

// Nueva función para obtener tamaños
async function getPackageSizes(packages) {
  const sizes = {};
  try {
    const lsOutput = execSync('npm ls --json --long', { stdio: 'pipe' }).toString();
    JSON.parse(lsOutput).dependencies && Object.entries(JSON.parse(lsOutput).dependencies).forEach(([name, pkg]) => {
      if (packages.includes(name)) {
        sizes[name] = {
          size: pkg.size || 0,
          gzip: Math.round((pkg.size || 0) * 0.3) // Estimación
        };
      }
    });
  } catch (error) {
    console.error(colors.yellow(`⚠ No se pudieron obtener tamaños: ${error.message}`));
  }
  return sizes;
}

// Función principal de auditoría
async function runAudit(options = {}) {
  try {
    const { direct, indirect } = await getAllDependencies();
    const allDeps = [...direct, ...indirect.map(d => d.name)];
    
    // Obtener datos adicionales según opciones
    const sizes = options.stats ? await getPackageSizes(allDeps) : {};
    const vulnerabilities = options.security ? await scanVulnerabilities(allDeps) : {};
    const licenses = options.oss ? await auditLicenses(allDeps) : {};

    // Análisis de dependencias
    const results = { 
      direct: { count: 0, packages: [] },
      indirect: { count: 0, packages: [] },
      byCategory: {}
    };

    // ... (análisis de categorías como en tu versión original)

    // Mostrar resultados
    console.log(colors.cyan('\n=== RESULTADOS ===\n'));
    
    if (options.stats) {
      console.log(colors.yellow('📊 ESTADÍSTICAS:'));
      console.log(`Total dependencias: ${direct.length + indirect.length}`);
      const totalSize = Object.values(sizes).reduce((sum, p) => sum + p.size, 0) / 1024 / 1024;
      console.log(`Tamaño estimado: ${totalSize.toFixed(2)} MB\n`);
    }

    if (options.security && Object.keys(vulnerabilities).length) {
      console.log(colors.yellow('⚠ VULNERABILIDADES:'));
      Object.entries(vulnerabilities).forEach(([name, vuln]) => {
        console.log(`${colors.red(name)}: ${vuln.severity}`);
      });
      console.log('');
    }

    // ... (resto de la lógica de visualización)

  } catch (error) {
    console.error(colors.red(`✖ Error: ${error.message}`));
    process.exit(1);
  }
}

// CLI Principal
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    verbose: args.includes('--verbose') || args.includes('-v'),
    stats: args.includes('--stats') || args.includes('-s'),
    security: args.includes('--security'),
    oss: args.includes('--oss'),
    fix: args.includes('--fix'),
    why: args.includes('--why') ? args[args.indexOf('--why') + 1] : null
  };
}

async function main() {
  const options = parseArgs();
  
  if (options.why) {
    const pkgInfo = await getPackageStats(options.why);
    console.log(colors.yellow(`\nℹ Información para ${options.why}:`));
    console.log(pkgInfo ? JSON.stringify(pkgInfo, null, 2) : 'No encontrado');
    return;
  }

  await runAudit(options);
}

// Ejecución
if (require.main === module) {
  main();
}

// API
module.exports = {
  runAudit,
  getAllDependencies,
  getPackageSizes,
  scanVulnerabilities,
  auditLicenses
};
