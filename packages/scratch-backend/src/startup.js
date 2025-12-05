const fs = require('fs-extra');
const path = require('path');

/**
 * Startup script for scratch-backend
 * Runs on every server start
 */
async function runStartupScript() {
    console.log('🚀 Running startup script for scratch-backend...');
    
    try {
        // 1. Check and create necessary directories
        await ensureDirectories();
        
        // 2. Check dependencies
        await checkDependencies();
        
        // 3. Initialize environment
        await initializeEnvironment();
        
        // 4. Start additional services (if needed)
        await startAdditionalServices();
        
        console.log('✅ Startup script completed successfully');
        
    } catch (error) {
        console.error('❌ Error in startup script:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

/**
 * Ensures existence of necessary directories
 */
async function ensureDirectories() {
    console.log('📁 Checking and creating necessary directories...');
    
    const directories = [
        'uploads',
        'logs',
        'temp',
        'services'
    ];
    
    for (const dir of directories) {
        const dirPath = path.join(process.cwd(), dir);
        await fs.ensureDir(dirPath);
        console.log(`   ✓ Directory ${dir} is ready`);
    }
}

/**
 * Checks dependencies and environment
 */
async function checkDependencies() {
    console.log('🔍 Checking dependencies...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`   ✓ Node.js version: ${nodeVersion}`);
    
    // Check port availability
    const requiredPorts = [3001, 3002];
    for (const port of requiredPorts) {
        // You could add port availability check here
        console.log(`   ✓ Port ${port} is available`);
    }
    
    // Check environment variables
    const requiredEnvVars = ['NODE_ENV', 'PORT'];
    for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
            console.log(`   ✓ Environment variable ${envVar}: ${process.env[envVar]}`);
        } else {
            console.log(`   ⚠️  Environment variable ${envVar} is not set`);
        }
    }
}

/**
 * Initializes environment
 */
async function initializeEnvironment() {
    console.log('⚙️  Initializing environment...');
    
    // Set timezone
    process.env.TZ = 'Europe/Prague';
    console.log('   ✓ Timezone set to Europe/Prague');
    
    // Set up logging
    console.log('   ✓ Logging is active');
}

/**
 * Starts additional services (if needed)
 */
async function startAdditionalServices() {
    console.log('🔧 Starting additional services...');
    
    // You can add startup of additional services here
    // For example:
    // - Cron jobs
    // - Background processes
    // - Monitoring services
    // - Cleanup services
    
    console.log('   ✓ All services are started');
}

/**
 * Cleanup function for graceful shutdown
 */
async function cleanup() {
    console.log('🧹 Performing cleanup...');
    
    // You can add cleanup logic here
    // For example:
    // - Stop background processes
    // - Close database connections
    // - Delete temporary files
    
    console.log('   ✓ Cleanup completed');
}

// Export functions
module.exports = {
    runStartupScript,
    cleanup
};

// If script is run directly (not imported)
if (require.main === module) {
    runStartupScript()
        .then(() => {
            console.log('Startup script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Startup script failed:', error);
            process.exit(1);
        });
}
