import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import VM from '@scratch/scratch-vm';

import ServiceButtonComponent from '../components/menu-bar/service-button.jsx';

class ServiceButton extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClick'
        ]);
        
        this.state = {
            isRunning: false,
            isLoading: false
        };
    }

    async handleClick () {
        if (this.state.isLoading) return;
        
        try {
            this.setState({ isLoading: true });
            
            if (this.state.isRunning) {
                // Zastav službu a pak automaticky spusť novou
                await this.stopService();
                // Po zastavení služby automaticky spusť novou
                await this.startService();
            } else {
                // Spusť službu
                await this.startService();
            }
        } catch (error) {
            console.error('Chyba při ovládání služby:', error);
            alert(`Chyba: ${error.message}`);
        } finally {
            this.setState({ isLoading: false });
        }
    }

    async startService () {
        try {
            // Zkontroluj, zda VM existuje
            if (!this.props.vm) {
                throw new Error('VM není k dispozici');
            }
            
            // Získej aktuální projekt jako JSON
            const projectData = this.props.vm.toJSON();
            const projectName = this.props.projectTitle || 'Neznámý projekt';
            
            // Pošli na backend
            const apiUrl = `http://${window.location.hostname}:3001/api/start-service-json`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectData: projectData,
                    projectName: projectName
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Chyba při spouštění služby');
            }
            
            const result = await response.json();
            this.setState({ isRunning: true });
            
            // Spusť WebSocket připojení pro sledování stavu
            this.connectWebSocket();
            
            // Zobraz alert jen při prvním spuštění, ne při restartu
            alert(`Služba "${projectName}" byla úspěšně spuštěna!`);
            
        } catch (error) {
            throw new Error(`Nepodařilo se spustit službu: ${error.message}`);
        }
    }

    async stopService () {
        try {
            const apiUrl = `http://${window.location.hostname}:3001/api/stop-service`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Chyba při zastavování služby');
            }
            
            // Okamžitě aktualizuj stav - nečekej na WebSocket zprávu
            this.setState({ isRunning: false });
            this.disconnectWebSocket();
            
            // Nezobrazuj alert při restartu - jen při manuálním zastavení
            // alert('Služba byla zastavena.');
            
        } catch (error) {
            throw new Error(`Nepodařilo se zastavit službu: ${error.message}`);
        }
    }

    connectWebSocket () {
        if (this.ws) {
            this.ws.close();
        }
        
        // Použijeme relativní URL pro WebSocket
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname;
        this.ws = new WebSocket(`${wsProtocol}//${wsHost}:3002`);
        
        this.ws.onopen = () => {
            console.log('WebSocket připojen');
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'status':
                        this.setState({ 
                            isRunning: data.data.running 
                        });
                        break;
                    case 'serviceStarted':
                        this.setState({ isRunning: true });
                        break;
                    case 'serviceStopped':
                        this.setState({ isRunning: false });
                        break;
                    case 'log':
                        console.log('Backend log:', data.data);
                        break;
                }
            } catch (error) {
                console.error('Chyba při zpracování WebSocket zprávy:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket odpojen');
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket chyba:', error);
        };
    }

    disconnectWebSocket () {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    componentDidMount () {
        // Zkontroluj stav služby při načtení
        this.checkServiceStatus();
    }

    componentWillUnmount () {
        this.disconnectWebSocket();
    }

    async checkServiceStatus () {
        try {
            const apiUrl = `http://${window.location.hostname}:3001/api/status`;
            const response = await fetch(apiUrl);
            if (response.ok) {
                const status = await response.json();
                this.setState({ isRunning: status.running });
                
                if (status.running) {
                    this.connectWebSocket();
                }
            }
        } catch (error) {
            console.error('Nepodařilo se zkontrolovat stav služby:', error);
        }
    }

    render () {
        return (
            <ServiceButtonComponent
                isRunning={this.state.isRunning}
                onClick={this.handleClick}
            />
        );
    }
}

ServiceButton.propTypes = {
    vm: PropTypes.instanceOf(VM).isRequired,
    projectTitle: PropTypes.string
};

const mapStateToProps = state => ({
    projectTitle: state.scratchGui.projectTitle,
    vm: state.scratchGui.vm
});

export default connect(mapStateToProps)(ServiceButton);
