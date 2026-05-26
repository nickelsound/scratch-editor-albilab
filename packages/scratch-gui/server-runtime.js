#!/usr/bin/env node

/**
 * Runtime server pro scratch-gui
 * Servuje statické soubory a vkládá runtime konfiguraci do index.html
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8601;
const BUILD_DIR = path.join(__dirname, 'build');

// Získání runtime konfigurace z environment proměnných
const getRuntimeConfig = () => {
    const config = {};
    
    // API Base URL
    if (process.env.REACT_APP_API_BASE_URL) {
        config.REACT_APP_API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
    }
    
    // WebSocket Base URL
    if (process.env.REACT_APP_WS_BASE_URL) {
        config.REACT_APP_WS_BASE_URL = process.env.REACT_APP_WS_BASE_URL;
    }

    const disableBackgroundProjects = process.env.REACT_APP_DISABLE_BACKGROUND_PROJECTS ||
        process.env.DISABLE_BACKGROUND_PROJECTS;
    if (disableBackgroundProjects) {
        config.REACT_APP_DISABLE_BACKGROUND_PROJECTS = disableBackgroundProjects;
    }
    
    return config;
};

// Middleware pro vložení runtime konfigurace do index.html
app.use((req, res, next) => {
    // Pokud není index.html, pokračuj normálně
    if (req.path !== '/' && req.path !== '/index.html') {
        return next();
    }
    
    // Pouze pro GET requesty
    if (req.method !== 'GET') {
        return next();
    }
    
    const indexPath = path.join(BUILD_DIR, 'index.html');
    
    // Zkontroluj, zda index.html existuje
    if (!fs.existsSync(indexPath)) {
        return next();
    }
    
    // Přečti index.html
    fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Chyba při čtení index.html:', err);
            return next();
        }
        
        // Získej runtime konfiguraci
        const runtimeConfig = getRuntimeConfig();
        
        // Pokud není žádná konfigurace, servuj soubor normálně
        if (Object.keys(runtimeConfig).length === 0) {
            return res.send(data);
        }
        
        // Vytvoř script tag s runtime konfigurací
        const configScript = `
<script>
  window.__RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};
</script>`;
        
        // Vlož script tag před </head> nebo na začátek <body>
        let modifiedHtml = data;
        
        // Zkus najít </head> tag
        if (modifiedHtml.includes('</head>')) {
            modifiedHtml = modifiedHtml.replace('</head>', `${configScript}\n</head>`);
        } else if (modifiedHtml.includes('<body>')) {
            // Pokud není </head>, vlož na začátek <body>
            modifiedHtml = modifiedHtml.replace('<body>', `<body>${configScript}`);
        } else {
            // Pokud není ani <body>, vlož na začátek souboru
            modifiedHtml = configScript + '\n' + modifiedHtml;
        }
        
        res.send(modifiedHtml);
    });
});

// Servuj statické soubory z build adresáře
app.use(express.static(BUILD_DIR));

// Fallback: pro SPA routování, servuj index.html pro všechny ostatní cesty
app.use((req, res) => {
    // Pouze pro GET requesty
    if (req.method !== 'GET') {
        return res.status(405).send('Method not allowed');
    }
    
    const indexPath = path.join(BUILD_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Not found');
    }
});

// Spusť server
app.listen(PORT, () => {
    const runtimeConfig = getRuntimeConfig();
    console.log(`🚀 Frontend server běží na portu ${PORT}`);
    if (Object.keys(runtimeConfig).length > 0) {
        console.log('📋 Runtime konfigurace:');
        Object.entries(runtimeConfig).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });
    } else {
        console.log('📋 Používá se default konfigurace (localhost:3001)');
    }
});
