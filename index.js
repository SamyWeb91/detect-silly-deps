#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const colors = require('colors');

// Configuración
const DB_PATH = path.join(__dirname, 'silly-db.json');

// Cargar base de datos
let sillyList = {};
try {
  sillyList = require(DB_PATH);
} catch (error) {
  console.error(colors.red(`✖ Error cargando la base de datos: ${error.message}`));
  process.exit(1);
}

// Funciones principales
async function getAllDependencies() {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    
    return {
      direct: [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {})
      ],
      indirect: getIndirectDeps()
    };
  } catch (error) {
    console.error(colors.red(`✖ Error: ${error.message}`));
    process.exit(1);
  }
}

function getIndirectDeps() {
  try {
    const output = execSync('npm ls --json --all --silent').toString();
    const depTree = JSON.parse(output).dependencies || {};
    const indirect = [];
    
    const traverse = (deps, parent) => {
      Object.entries(deps || {}).forEach(([name, pkg]) => {
        indirect.push({ name, parent: parent || 'root', version: pkg.version });
        traverse(pkg.dependencies, name);
      });
    };
    
    traverse(depTree);
    return indirect;
  } catch {
    return [];
  }
}

// Nueva: Escaneo de vulnerabilidades
async function scanVulnerabilities(packages) {
  try {
    const output = execSync('npm audit --json').toString();
    const auditData = JSON.parse(output);
    const vulns = {};
    
    Object.entries(auditData.vulnerabilities || {}).forEach(([name, data]) => {
      if (packages.includes(name)) {
        vulns[name] = {
          severity: data.severity,
          via: data.via.map(v => typeof v === 'string' ? v : v.title),
          fixAvailable: data.fixAvailable
        };
      }
    });
    
    return vulns;
  } catch (error) {
    console.error(colors.yellow(`⚠ Error en escaneo de vulnerabilidades: ${error.message}`));
    return {};
  }
}

// Nueva: Auditoría de licencias
async function auditLicenses(packages) {
  try {
    const output = execSync('npm ls --json --long').toString();
    const depTree = JSON.parse(output).dependencies || {};
    const licenses = {};
    
    const traverse = (deps) => {
      Object.entries(deps || {}).forEach(([name, pkg]) => {
        if (packages.includes(name)) {
          licenses[name] = {
            license: pkg.license || 'Desconocida',
            repository: pkg.repository?.url || 'No especificado'
          };
        }
        traverse(pkg.dependencies);
      });
    };
    
    traverse(depTree);
    return licenses;
  } catch (error) {
    console.error(colors.yellow(`⚠ Error en auditoría de licencias: ${error.message}`));
    return {};
  }
}

// Nueva: Estadísticas de tamaño
async function getPackageSizes(packages) {
  try {
    const output = execSync('npm ls --json --long').toString();
    const depTree = JSON.parse(output).dependencies || {};
    const sizes = {};
    
    const traverse = (deps) => {
      Object.entries(deps || {}).forEach(([name, pkg]) => {
        if (packages.includes(name) && pkg.size) {
          sizes[name] = {
            size: pkg.size,
            gzip: Math.round(pkg.size * 0.3) // Estimación
          };
        }
        traverse(pkg.dependencies);
      });
    };
    
    traverse(depTree);
    return sizes;
  } catch (error) {
    console.error(colors.yellow(`⚠ Error obteniendo tamaños: ${error.message}`));
    return {};
  }
}

// Función principal
async function runAudit(options = {}) {
  try {
    const { direct, indirect } = await getAllDependencies();
    const allDeps = [...direct, ...indirect.map(d => d.name)];
    
    // Obtener datos adicionales según opciones
    const [sizes, vulnerabilities, licenses] = await Promise.all([
      options.stats ? getPackageSizes(allDeps) : Promise.resolve({}),
      options.security ? scanVulnerabilities(allDeps) : Promise.resolve({}),
      options.oss ? auditLicenses(allDeps) : Promise.resolve({})
    ]);

    // Análisis de dependencias
    const results = analyzeDependencies(direct, indirect);

    // Mostrar resultados
    printResults(results, {
      sizes,
      vulnerabilities, 
      licenses,
      verbose: options.verbose,
      stats: options.stats
    });

  } catch (error) {
    console.error(colors.red(`✖ Error: ${error.message}`));
    process.exit(1);
  }
}

function analyzeDependencies(direct, indirect) {
  const results = {
    direct: { count: 0, packages: [] },
    indirect: { count: 0, packages: [] },
    byCategory: {}
  };

  // ... (lógica de análisis de categorías)

  return results;
}

function printResults(results, { sizes, vulnerabilities, licenses, verbose, stats }) {
  // ... (lógica de impresión mejorada)
}

// CLI
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
    // Lógica para --why
    return;
  }

  await runAudit(options);
}

if (require.main === module) {
  main();
}

module.exports = {
  runAudit,
  getAllDependencies,
  scanVulnerabilities,
  auditLicenses,
  getPackageSizes
};
