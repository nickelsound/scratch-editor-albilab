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
    start() {
        if (!this.isEnabled || !this.vm) {
            console.log('Auto-save nelze spustit - není inicializován');
            return;
        }

        console.log('Spouštím auto-save službu');
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
                this.updateSaveStatus('saved');
            } else {
                console.error('Chyba při automatickém ukládání:', response.status, response.statusText);
                this.updateSaveStatus('error');
            }

        } catch (error) {
            console.error('Chyba při automatickém ukládání:', error);
            this.updateSaveStatus('error');
        } finally {
            this.isSaving = false;
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
                isSaving: this.isSaving
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
