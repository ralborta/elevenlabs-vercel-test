#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = './api/versions/config.js';

function updateDefaultVersion(newVersion) {
  try {
    let configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    
    // Actualizar la versión por defecto
    configContent = configContent.replace(
      /export const DEFAULT_VERSION = ['"]v\d+['"];/,
      `export const DEFAULT_VERSION = '${newVersion}';`
    );
    
    fs.writeFileSync(CONFIG_PATH, configContent);
    console.log(`✅ Versión por defecto actualizada a: ${newVersion}`);
    
  } catch (error) {
    console.error('❌ Error al actualizar la versión:', error.message);
    process.exit(1);
  }
}

function showCurrentVersion() {
  try {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    const match = configContent.match(/export const DEFAULT_VERSION = ['"](v\d+)['"];/);
    
    if (match) {
      console.log(`📋 Versión actual por defecto: ${match[1]}`);
    } else {
      console.log('❌ No se pudo determinar la versión actual');
    }
    
  } catch (error) {
    console.error('❌ Error al leer la configuración:', error.message);
  }
}

function showHelp() {
  console.log(`
🔄 Gestor de Versiones de API

Uso:
  node scripts/version-manager.js <comando> [opciones]

Comandos:
  current                    Mostrar versión actual
  set <version>             Cambiar versión por defecto (ej: v1, v2)
  help                      Mostrar esta ayuda

Ejemplos:
  node scripts/version-manager.js current
  node scripts/version-manager.js set v1
  node scripts/version-manager.js set v2
`);
}

// Procesar argumentos
const command = process.argv[2];
const version = process.argv[3];

switch (command) {
  case 'current':
    showCurrentVersion();
    break;
    
  case 'set':
    if (!version) {
      console.error('❌ Debes especificar una versión (ej: v1, v2)');
      process.exit(1);
    }
    if (!version.match(/^v\d+$/)) {
      console.error('❌ Formato de versión inválido. Usa: v1, v2, v3, etc.');
      process.exit(1);
    }
    updateDefaultVersion(version);
    break;
    
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
    
  default:
    console.error('❌ Comando no reconocido');
    showHelp();
    process.exit(1);
} 