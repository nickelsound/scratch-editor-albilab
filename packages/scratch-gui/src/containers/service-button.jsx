import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {injectIntl, intlShape} from 'react-intl';
import VM from '@scratch/scratch-vm';

import ServiceButtonComponent from '../components/menu-bar/service-button.jsx';
import {getApiUrl, getWebSocketUrl} from '../lib/api-config.js';

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
                // Stop service and then automatically start new one
                await this.stopService();
                // After stopping service, automatically start new one
                await this.startService();
            } else {
                // Start service
                await this.startService();
            }
        } catch (error) {
            console.error('Error controlling service:', error);
            const errorMsg = this.props.intl.formatMessage({id: 'gui.errors.controllingService'});
            alert(`${errorMsg}: ${error.message}`);
        } finally {
            this.setState({ isLoading: false });
        }
    }

    async startService () {
        try {
            // Check if VM exists
            if (!this.props.vm) {
                throw new Error('VM is not available');
            }
            
            // Get current project as JSON
            const projectData = this.props.vm.toJSON();
            const projectName = this.props.projectTitle || 'Unknown project';
            
            // Send to backend
            const apiUrl = getApiUrl('/start-service-json');
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
                const errorMsg = this.props.intl.formatMessage({id: 'gui.errors.startingService'});
                throw new Error(errorData.error || errorMsg);
            }
            
            const result = await response.json();
            this.setState({ isRunning: true });
            
            // Start WebSocket connection for status monitoring
            this.connectWebSocket();
            
            // Show alert only on first start, not on restart
            alert(`Service "${projectName}" has been started successfully!`);
            
        } catch (error) {
            throw new Error(`Failed to start service: ${error.message}`);
        }
    }

    async stopService () {
        try {
            const apiUrl = getApiUrl('/stop-service');
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                const errorMsg = this.props.intl.formatMessage({id: 'gui.errors.stoppingService'});
                throw new Error(errorData.error || errorMsg);
            }
            
            // Immediately update state - don't wait for WebSocket message
            this.setState({ isRunning: false });
            this.disconnectWebSocket();
            
            // Don't show alert on restart - only on manual stop
            // alert('Service has been stopped.');
            
        } catch (error) {
            throw new Error(`Failed to stop service: ${error.message}`);
        }
    }

    connectWebSocket () {
        if (this.ws) {
            this.ws.close();
        }
        
        // Use relative URL for WebSocket
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname;
        this.ws = new WebSocket(getWebSocketUrl('/ws'));
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
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
                console.error('Error processing WebSocket message:', error);
                // WebSocket errors are logged but not shown to users
            }
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    disconnectWebSocket () {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    componentDidMount () {
        // Check service status on load
        this.checkServiceStatus();
    }

    componentWillUnmount () {
        this.disconnectWebSocket();
    }

    async checkServiceStatus () {
        try {
            const apiUrl = getApiUrl('/status');
            const response = await fetch(apiUrl);
            if (response.ok) {
                const status = await response.json();
                this.setState({ isRunning: status.running });
                
                if (status.running) {
                    this.connectWebSocket();
                }
            }
        } catch (error) {
            console.error('Failed to check service status:', error);
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
    intl: intlShape.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired,
    projectTitle: PropTypes.string
};

const mapStateToProps = state => ({
    projectTitle: state.scratchGui.projectTitle,
    vm: state.scratchGui.vm
});

export default injectIntl(connect(mapStateToProps)(ServiceButton));
