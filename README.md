# 🧹 detect-silly-deps

A CLI tool to detect and optionally remove trivial or unnecessary dependencies from your Node.js projects. Say goodbye to `is-seven`, `left-pad`, and other nonsense.

## ✨ Features

✅ Detects over 200+ silly or low-value dependencies  
✅ CLI usage with detailed stats and explanations  
✅ Supports Spanish output with `--lang=es`  
✅ Lightweight and fast (under 40 kB)

## 🚀 Installation

```bash
npm i detect-silly-deps

detect-silly-deps --stats      # Shows size of each dependency  
detect-silly-deps --verbose    # Detailed report  
detect-silly-deps --why        # Explains why a dependency is flagged  
detect-silly-deps --lang=es    # Output in Spanish
#********** new features***********************************
Important new features in this code
Audit history (.silly-history.json)

Result caching for quick analysis

Result export (--out=file.json)

Category filtering (--category=performance, etc.)

Colorless option (--no-color)

Automatic language detection

Faster and more organized code
#**************************************************************************
#**********************************EXAMPLES********************************
#**********************************************EJEMPLOS***********************
# Análisis básico
npx detect-silly-deps

# Modo detallado
npx detect-silly-deps --verbose

# Filtrar por categoría "performance"
npx detect-silly-deps --category=performance

# Guardar resultados en JSON
npx detect-silly-deps --out=resultado.json

# Forzar idioma español
npx detect-silly-deps --lang=es

# Sin colores
npx detect-silly-deps --no-color
#*******************************************************************************

#**************leame.md*************************************


✨ Características Principales
✅ Detecta 200+ dependencias absurdas o poco utiles
Español
detect-silly-deps --lang=es

Uso con CLI
detect-silly-deps --stats (muestra el tamano de la libreria) detect-silly-deps --verbose (reporete detallado) detect-silly-deps --why (explica comanados)

?? Contribuir
Clona el repositorio
Instala dependencias: npm install
Haz tus cambios
Ejecuta tests: npm test
Envía un Pull Request
?? Reportar Problemas
Por favor incluye:

# repositorio 
https://github.com/SamyWeb91/detect-silly-deps

Comando ejecutado
Salida obtenida
Versión de Node.js (node -v)
Sistema Operativo

#*************mejoras****************************
## ?? Últimas Mejoras en `detect-silly-deps`

### ?? Rastreo Avanzado de Dependencias
- Muestra **rutas jerárquicas** completas de paquetes indirectos  
  Ejemplo: `react > legacy-package > left-pad`

### ?? Métricas de Impacto
```bash
=== ESTADÍSTICAS ===
Total dependencias: 24  
Espacio estimado: 12MB
#**************************mejoras ultima version*************************************
✅ Novedades importantes en este código
Historial de auditorías (.silly-history.json)

Cacheo de resultados para análisis rápidos

Exportación de resultados (--out=archivo.json)

Filtro por categoría (--category=performance, etc.)

Opción sin colores (--no-color)

Detección automática de idioma

Código más rápido y organizado
#**********************************************EJEMPLOS***********************
# Análisis básico
npx detect-silly-deps

# Modo detallado
npx detect-silly-deps --verbose

# Filtrar por categoría "performance"
npx detect-silly-deps --category=performance

# Guardar resultados en JSON
npx detect-silly-deps --out=resultado.json

# Forzar idioma español
npx detect-silly-deps --lang=es

# Sin colores
npx detect-silly-deps --no-color
#*******************************************************************************

 Licence
MIT © 2025 [Samuel Tamayo Infante]
