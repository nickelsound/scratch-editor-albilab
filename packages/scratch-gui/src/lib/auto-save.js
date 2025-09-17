/**
 * Auto-save služba pro automatické ukládání projektů
 */
class AutoSaveService {
    constructor() {
        this.isEnabled = true;
        this.saveInterval = 30000; // 30 sekund
        this.lastSaveTime = null;
        this.isSaving = false;
        this.saveTimeout = null;
        this.vm = null;
        this.projectTitle = 'Neznámý projekt';
        this.onSaveStatusChange = null;
    }

    /**
     * Nastaví VM instanci a callback pro změny stavu
     */
    initialize(vm, projectTitle, onSaveStatusChange = null) {
        this.vm = vm;
        this.projectTitle = projectTitle || 'Neznámý projekt';
        this.onSaveStatusChange = onSaveStatusChange;
        
        console.log('Auto-save služba inicializována', {
            projectTitle: this.projectTitle,
            saveInterval: this.saveInterval
        });
    }

    /**
     * Spustí automatické ukládání
     */
    async start() {
        if (!this.isEnabled || !this.vm) {
            console.log('Auto-save nelze spustit - není inicializován');
            return;
        }

        console.log('Spouštím auto-save službu');
        
        // Zkus načíst existující auto-save projekt
        await this.loadExistingProject();
        
        this.scheduleNextSave();
    }

    /**
     * Zastaví automatické ukládání
     */
    stop() {
        console.log('Zastavuji auto-save službu');
        this.isEnabled = false;
        
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }

    /**
     * Načte existující auto-save projekt podle názvu
     */
    async loadExistingProject() {
        if (!this.projectTitle || this.projectTitle === 'Neznámý projekt') {
            console.log('Název projektu není zadán - nelze načíst auto-save projekt');
            return;
        }

        try {
            const apiUrl = `${window.location.protocol}//${window.location.hostname}:3001/api/saved-project/auto-save/load?projectName=${encodeURIComponent(this.projectTitle)}`;
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.projectData) {
                    console.log(`Načítám existující auto-save projekt: ${result.projectName}`);
                    
                    // Načti projekt do VM
                    await this.vm.loadProject(result.projectData);
                    
                    // Aktualizuj čas posledního uložení
                    this.lastSaveTime = new Date(result.savedAt);
                    this.updateSaveStatus('loaded');
                    
                    console.log('Auto-save projekt úspěšně načten');
                } else {
                    console.log('Žádný auto-save projekt nebyl nalezen pro:', this.projectTitle);
                }
            } else {
                console.log('Auto-save projekt nebyl nalezen pro:', this.projectTitle);
            }
        } catch (error) {
            console.error('Chyba při načítání auto-save projektu:', error);
        }
    }

    /**
     * Naplánuje další uložení
     */
    scheduleNextSave() {
        if (!this.isEnabled) return;

        this.saveTimeout = setTimeout(() => {
            this.performAutoSave();
        }, this.saveInterval);
    }

    /**
     * Provede automatické uložení
     */
    async performAutoSave() {
        if (this.isSaving || !this.vm) {
            this.scheduleNextSave();
            return;
        }

        try {
            this.isSaving = true;
            this.updateSaveStatus('saving');

            console.log('Provádím automatické uložení projektu...');
            
            // Získej aktuální data projektu z VM jako JSON
            const projectData = this.vm.toJSON();
            
            // Pošli na backend
            const apiUrl = `${window.location.protocol}//${window.location.hostname}:3001/api/saved-project/auto-save`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectData: projectData,
                    projectName: this.projectTitle
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.lastSaveTime = new Date();
                console.log('Projekt automaticky uložen:', result);
                this.isSaving = false;
                this.updateSaveStatus('saved');
            } else {
                console.error('Chyba při automatickém ukládání:', response.status, response.statusText);
                this.isSaving = false;
                this.updateSaveStatus('error');
            }

        } catch (error) {
            console.error('Chyba při automatickém ukládání:', error);
            this.isSaving = false;
            this.updateSaveStatus('error');
        } finally {
            this.scheduleNextSave();
        }
    }

    /**
     * Aktualizuje stav ukládání
     */
    updateSaveStatus(status) {
        if (this.onSaveStatusChange) {
            this.onSaveStatusChange({
                status: status,
                lastSaveTime: this.lastSaveTime,
                isSaving: status === 'saving' ? true : false
            });
        }
    }

    /**
     * Nastaví název projektu
     */
    setProjectTitle(title) {
        this.projectTitle = title || 'Neznámý projekt';
        console.log('Název projektu aktualizován:', this.projectTitle);
    }

    /**
     * Nastaví interval ukládání (v milisekundách)
     */
    setSaveInterval(interval) {
        this.saveInterval = Math.max(5000, interval); // Minimálně 5 sekund
        console.log('Interval ukládání nastaven na:', this.saveInterval, 'ms');
    }

    /**
     * Vynutí okamžité uložení
     */
    async forceSave() {
        if (this.isSaving) {
            console.log('Ukládání již probíhá...');
            return false;
        }

        console.log('Vynucuji okamžité uložení...');
        await this.performAutoSave();
        return true;
    }

    /**
     * Získá informace o stavu auto-save
     */
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            isSaving: this.isSaving,
            lastSaveTime: this.lastSaveTime,
            saveInterval: this.saveInterval,
            projectTitle: this.projectTitle
        };
    }
}

// Vytvoř globální instanci
const autoSaveService = new AutoSaveService();

export default autoSaveService;
