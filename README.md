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

## 🚀 Instalación
```bash
npm install -g detect-silly-deps

para uso local

npm install --save-dev detect-silly-deps

para uso básico (CLI)
# Auditoría básica
silly-audit

# Modo detallado
silly-audit --verbose

# Mostrar estadísticas y tamaños
silly-audit --stats

# Escanear vulnerabilidades
silly-audit --security

# Auditoría OSS (licencias)
silly-audit --oss

# Auto-corregir dependencias
silly-audit --fix

# Consultar paquete específico
silly-audit --why=is-odd

# Español
silly-audit --lang=es

#†**********************************†*********************
Uso programático:

const { audit, getVulnerabilityAudit } = require('detect-silly-deps');

// Auditoría básica
const results = await audit();

// Auditoría de seguridad
const vulns = await getVulnerabilityAudit();

// Obtener tamaño de paquete
const { getPackageSize } = require('detect-silly-deps');
const size = await getPackageSize('lodash.get');

## ?? Novedades en v3.0
- **Auditoría de seguridad** integrada (`npm audit`)
- **Tamaños de paquetes** en tiempo real
- **Análisis OSS** de licencias
- **30% más rápido** con caché inteligente
- **Nuevas categorías** de dependencias
- **Soporte para monorepos**

## ?? API Completa

### Métodos Principales
| Método | Descripción |
|--------|-------------|
| `audit(options)` | Auditoría completa de dependencias |
| `getVulnerabilityAudit()` | Escaneo de vulnerabilidades |
| `getOssAudit()` | Auditoría de licencias OSS |
| `getPackageSize(pkgName)` | Obtiene tamaño de paquete |
| `suggestAlternative(pkgName)` | Sugiere alternativa nativa |

### Opciones de `audit()`
```typescript
{
  returnData?: boolean;     // Retorna datos en lugar de imprimir
  verbose?: boolean;       // Modo detallado
  stats?: boolean;         // Mostrar estadísticas
  security?: boolean;      // Incluir vulnerabilidades
  oss?: boolean;           // Incluir datos OSS
  fix?: boolean;           // Auto-corregir
  lang?: 'en' | 'es';      // Idioma
}
```

## ?? Internacionalización
Soporte para inglés y español:
```bash
silly-audit --lang=es
```

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
