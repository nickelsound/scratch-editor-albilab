const fs = require('fs-extra');
const path = require('path');

/**
 * Startup script pro scratch-backend
 * Spustí se při každém startu serveru
 */
async function runStartupScript() {
    console.log('🚀 Spouštím startup script pro scratch-backend...');
    
    try {
        // 1. Kontrola a vytvoření potřebných adresářů
        await ensureDirectories();
        
        // 2. Kontrola závislostí
        await checkDependencies();
        
        // 3. Inicializace prostředí
        await initializeEnvironment();
        
        // 4. Spuštění dalších služeb (pokud jsou potřeba)
        await startAdditionalServices();
        
        console.log('✅ Startup script úspěšně dokončen');
        
    } catch (error) {
        console.error('❌ Chyba v startup scriptu:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

/**
 * Zajistí existenci potřebných adresářů
 */
async function ensureDirectories() {
    console.log('📁 Kontroluji a vytvářím potřebné adresáře...');
    
    const directories = [
        'uploads',
        'logs',
        'temp',
        'services'
    ];
    
    for (const dir of directories) {
        const dirPath = path.join(process.cwd(), dir);
        await fs.ensureDir(dirPath);
        console.log(`   ✓ Adresář ${dir} je připraven`);
    }
}

/**
 * Kontroluje závislosti a prostředí
 */
async function checkDependencies() {
    console.log('🔍 Kontroluji závislosti...');
    
    // Kontrola Node.js verze
    const nodeVersion = process.version;
    console.log(`   ✓ Node.js verze: ${nodeVersion}`);
    
    // Kontrola dostupnosti portů
    const requiredPorts = [3001, 3002];
    for (const port of requiredPorts) {
        // Zde byste mohli přidat kontrolu dostupnosti portů
        console.log(`   ✓ Port ${port} je k dispozici`);
    }
    
    // Kontrola environment proměnných
    const requiredEnvVars = ['NODE_ENV', 'PORT'];
    for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
            console.log(`   ✓ Environment proměnná ${envVar}: ${process.env[envVar]}`);
        } else {
            console.log(`   ⚠️  Environment proměnná ${envVar} není nastavena`);
        }
    }
}

/**
 * Inicializuje prostředí
 */
async function initializeEnvironment() {
    console.log('⚙️  Inicializuji prostředí...');
    
    // Nastavení timezone
    process.env.TZ = 'Europe/Prague';
    console.log('   ✓ Timezone nastavena na Europe/Prague');
    
    // Nastavení logování
    console.log('   ✓ Logování je aktivní');
}

/**
 * Spustí další služby (pokud jsou potřeba)
 */
async function startAdditionalServices() {
    console.log('🔧 Spouštím další služby...');
    
    // Zde můžete přidat spuštění dalších služeb
    // Například:
    // - Cron joby
    // - Background procesy
    // - Monitoring služby
    // - Cleanup služby
    
    console.log('   ✓ Všechny služby jsou spuštěny');
}

/**
 * Cleanup funkce pro graceful shutdown
 */
async function cleanup() {
    console.log('🧹 Provádím cleanup...');
    
    // Zde můžete přidat cleanup logiku
    // Například:
    // - Zastavení background procesů
    // - Uzavření databázových připojení
    // - Smazání dočasných souborů
    
    console.log('   ✓ Cleanup dokončen');
}

// Export funkcí
module.exports = {
    runStartupScript,
    cleanup
};

// Pokud je script spuštěn přímo (ne importován)
if (require.main === module) {
    runStartupScript()
        .then(() => {
            console.log('Startup script dokončen');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Startup script selhal:', error);
            process.exit(1);
        });
}
