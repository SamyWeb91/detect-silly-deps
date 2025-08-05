# Detecta dependencias absurdas en tu proyecto Node.js y sugiere alternativas nativas

[![npm version](https://img.shields.io/npm/v/detect-silly-deps.svg)](https://www.npmjs.com/package/detect-silly-deps)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Características Principales
- ✅ Detecta 200+ dependencias absurdas
- ✅ Auditoría de tamaño de librerías
- ✅ Escaneo de vulnerabilidades de seguridad
- ✅ Auditoría OSS (licencias y dependencias)
- ✅ Clasificación por categorías (boolean, math, string, etc.)
- ✅ Soporte multiidioma (inglés/español)
- ✅ Sugiere alternativas nativas
- ✅ Auto-corrección (`--fix`)

# Instalación global
npm install -g detect-silly-deps

# Instalación local
npm install --save-dev detect-silly-deps

# Uso básico (CLI)
silly-audit

# Modo detallado
silly-audit --verbose

# Mostrar estadísticas y tamaños
detect-silly-deps --stats

# Escanear vulnerabilidades
detect-silly-deps --security

# Auditoría OSS (licencias)
detect-silly-deps --oss

# Consultar paquete específico
detect-silly-deps --why=is-odd

# Español
detect-silly-deps --lang=es

## ?? Contribuir
1. Clona el repositorio
2. Instala dependencias: `npm install`
3. Haz tus cambios
4. Ejecuta tests: `npm test`
5. Envía un Pull Request

## ?? Reportar Problemas
Por favor incluye:
1. Comando ejecutado
2. Salida obtenida
3. Versión de Node.js (`node -v`)
4. Sistema Operativo

## ?? Licencia
MIT © 2025 [Samuel Tamayo Infante]
