#!/usr/bin/env python3
"""
BLE WiFi Configuration Server for Raspberry Pi
Receives WiFi credentials via BLE and configures WiFi connection

This implementation uses bluez via dbus-python to create a BLE GATT server.
Requires bluez to be installed and running on the Raspberry Pi.
"""

import dbus
import dbus.exceptions
import dbus.mainloop.glib
import dbus.service
import logging
from gi.repository import GLib
from wifi_config import configure_wifi, get_current_ip_address, scan_wifi_networks
import threading
import subprocess
import time
import json
import os

# BLE Service and Characteristic UUIDs
# Using custom UUIDs to avoid conflicts with standard Bluetooth services
WIFI_CONFIG_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc"
WIFI_SSID_CHAR_UUID = "12345678-1234-1234-1234-123456789abd"
WIFI_PASSWORD_CHAR_UUID = "12345678-1234-1234-1234-123456789abe"
STATUS_CHAR_UUID = "12345678-1234-1234-1234-123456789abf"
IP_ADDRESS_CHAR_UUID = "12345678-1234-1234-1234-123456789ac0"
WIFI_SCAN_CHAR_UUID = "12345678-1234-1234-1234-123456789ac1"
CONTAINER_STATUS_CHAR_UUID = "12345678-1234-1234-1234-123456789ac2"
START_CONTAINERS_CHAR_UUID = "12345678-1234-1234-1234-123456789ac3"
CONTAINER_LOGS_CHAR_UUID = "12345678-1234-1234-1234-123456789ac4"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BLUEZ_SERVICE_NAME = 'org.bluez'
ADAPTER_IFACE = 'org.bluez.Adapter1'
GATT_MANAGER_IFACE = 'org.bluez.GattManager1'
LE_ADVERTISING_MANAGER_IFACE = 'org.bluez.LEAdvertisingManager1'
LE_ADVERTISEMENT_IFACE = 'org.bluez.LEAdvertisement1'
DBUS_OM_IFACE = 'org.freedesktop.DBus.ObjectManager'
DBUS_PROP_IFACE = 'org.freedesktop.DBus.Properties'
GATT_SERVICE_IFACE = 'org.bluez.GattService1'
GATT_CHRC_IFACE = 'org.bluez.GattCharacteristic1'


class InvalidArgsException(dbus.exceptions.DBusException):
    _dbus_error_name = 'org.freedesktop.DBus.Error.InvalidArgs'


class NotSupportedException(dbus.exceptions.DBusException):
    _dbus_error_name = 'org.bluez.Error.NotSupported'


class NotPermittedException(dbus.exceptions.DBusException):
    _dbus_error_name = 'org.bluez.Error.NotPermitted'


class InvalidValueLengthException(dbus.exceptions.DBusException):
    _dbus_error_name = 'org.bluez.Error.InvalidValueLength'


class FailedException(dbus.exceptions.DBusException):
    _dbus_error_name = 'org.bluez.Error.Failed'


class Advertisement(dbus.service.Object):
    """LE Advertisement"""
    
    PATH_BASE = '/org/bluez/example/advertisement'
    
    def __init__(self, bus, index, service_uuid):
        self.path = self.PATH_BASE + str(index)
        self.bus = bus
        self.service_uuid = service_uuid
        dbus.service.Object.__init__(self, bus, self.path)
    
    def get_properties(self):
        return {
            LE_ADVERTISEMENT_IFACE: {
                'Type': 'peripheral',
                'LocalName': 'AlbiLAB RPi Scratch',
                'ServiceUUIDs': dbus.Array([self.service_uuid], signature='s'),
                'ManufacturerData': dbus.Dictionary({}, signature='qv'),
                'SolicitUUIDs': dbus.Array([], signature='s'),
                'ServiceData': dbus.Dictionary({}, signature='sv'),
                'Data': dbus.Dictionary({}, signature='yv'),
                'Includes': dbus.Array(['tx-power'], signature='s'),
            }
        }
    
    def get_path(self):
        return dbus.ObjectPath(self.path)
    
    @dbus.service.method(DBUS_PROP_IFACE,
                         in_signature='s',
                         out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != LE_ADVERTISEMENT_IFACE:
            raise InvalidArgsException()
        return self.get_properties()[LE_ADVERTISEMENT_IFACE]
    
    @dbus.service.method(LE_ADVERTISEMENT_IFACE,
                         in_signature='',
                         out_signature='')
    def Release(self):
        logger.info('Advertisement released')


class Application(dbus.service.Object):
    """Main application object"""
    
    def __init__(self, bus):
        self.path = '/org/bluez/example'
        self.services = []
        dbus.service.Object.__init__(self, bus, self.path)
    
    def get_path(self):
        return dbus.ObjectPath(self.path)
    
    def add_service(self, service):
        self.services.append(service)
    
    @dbus.service.method(DBUS_OM_IFACE, out_signature='a{oa{sa{sv}}}')
    def GetManagedObjects(self):
        """Return all managed objects (services and characteristics)"""
        import traceback
        logger.info("=== GetManagedObjects CALLED ===")
        logger.info(f"Call stack: {''.join(traceback.format_stack()[-3:-1])}")
        response = {}
        
        # Add all services
        for service in self.services:
            service_props = service.get_properties()
            response[service.get_path()] = service_props
            logger.info(f"Added service {service.uuid} to GetManagedObjects at path {service.get_path()}")
            
            # Add all characteristics for each service
            for chrc in service.characteristics:
                chrc_props = chrc.get_properties()
                chrc_path = chrc.get_path()
                response[chrc_path] = chrc_props
                logger.info(f"Added characteristic {chrc.uuid} to GetManagedObjects at path {chrc_path}")
                # Log properties for IP address characteristic
                if chrc.uuid == IP_ADDRESS_CHAR_UUID:
                    logger.info(f"*** IP ADDRESS CHARACTERISTIC IN GetManagedObjects ***")
                    logger.info(f"IP Address characteristic properties: {chrc_props}")
        
        logger.info(f"GetManagedObjects returning {len(response)} objects")
        logger.info("=== END GetManagedObjects ===")
        return response


class Service(dbus.service.Object):
    """GATT Service"""
    
    PATH_BASE = '/org/bluez/example/service'

    def __init__(self, bus, index, uuid, primary):
        self.path = self.PATH_BASE + str(index)
        self.bus = bus
        self.uuid = uuid
        self.primary = primary
        self.characteristics = []
        dbus.service.Object.__init__(self, bus, self.path)

    def get_properties(self):
        return {
            GATT_SERVICE_IFACE: {
                'UUID': self.uuid,
                'Primary': self.primary,
                'Characteristics': dbus.Array(
                    self.get_characteristic_paths(),
                    signature='o')
            }
        }

    def get_path(self):
        return dbus.ObjectPath(self.path)

    def add_characteristic(self, characteristic):
        self.characteristics.append(characteristic)

    def get_characteristic_paths(self):
        result = []
        for chrc in self.characteristics:
            result.append(chrc.get_path())
        return result

    @dbus.service.method(DBUS_PROP_IFACE,
                         in_signature='s',
                         out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != GATT_SERVICE_IFACE:
            raise InvalidArgsException()
        logger.info(f"Service.GetAll called for interface: {interface}, UUID: {self.uuid}")
        return self.get_properties()[GATT_SERVICE_IFACE]


class Characteristic(dbus.service.Object):
    """GATT Characteristic"""
    
    def __init__(self, bus, index, uuid, flags, service):
        self.path = service.path + '/char' + str(index)
        self.bus = bus
        self.uuid = uuid
        self.service = service
        self.flags = flags
        self.value = dbus.Array([], signature=dbus.Signature('y'))
        dbus.service.Object.__init__(self, bus, self.path)

    def get_properties(self):
        value_str = ''.join([chr(b) for b in self.value]) if self.value else ""
        if self.uuid == IP_ADDRESS_CHAR_UUID:
            logger.info(f'IPAddressCharacteristic.get_properties called: value="{value_str}", length={len(self.value)}')
        props = {
            GATT_CHRC_IFACE: {
                'Service': self.service.get_path(),
                'UUID': self.uuid,
                'Flags': dbus.Array(self.flags, signature='s'),
                'Value': self.value
            }
        }
        # Log for IP address characteristic
        if self.uuid == IP_ADDRESS_CHAR_UUID:
            logger.info(f'IPAddressCharacteristic.get_properties returning: UUID={self.uuid}, Flags={self.flags}, Value length={len(self.value)}')
        return props

    def get_path(self):
        return dbus.ObjectPath(self.path)

    @dbus.service.method(DBUS_PROP_IFACE,
                         in_signature='s',
                         out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != GATT_CHRC_IFACE:
            raise InvalidArgsException()
        logger.info(f"Characteristic.GetAll called for UUID: {self.uuid}, interface: {interface}")
        if self.uuid == IP_ADDRESS_CHAR_UUID:
            logger.info(f"*** IPAddressCharacteristic.GetAll CALLED ***")
        result = self.get_properties()[GATT_CHRC_IFACE]
        if self.uuid == IP_ADDRESS_CHAR_UUID:
            logger.info(f"IPAddressCharacteristic.GetAll returning: {result}")
        return result

    @dbus.service.method(GATT_CHRC_IFACE,
                         in_signature='a{sv}',
                         out_signature='ay')
    def ReadValue(self, options):
        logger.info(f'=== ReadValue CALLED ===')
        logger.info(f'Characteristic UUID: {self.uuid}')
        logger.info(f'Options: {options}')
        value_str = ''.join([chr(b) for b in self.value]) if self.value else ""
        # For IP address, also try to get current value if empty
        if self.uuid == IP_ADDRESS_CHAR_UUID and len(self.value) == 0:
            current_ip = get_current_ip_address()
            if current_ip:
                logger.info(f'IPAddressCharacteristic.ReadValue: value was empty, getting current IP: {current_ip}')
                ip_bytes = current_ip.encode('utf-8')
                self.value = dbus.Array([dbus.Byte(b) for b in ip_bytes], signature=dbus.Signature('y'))
                value_str = current_ip
        logger.info(f'ReadValue returning: UUID={self.uuid}, value length={len(self.value)}, value="{value_str}"')
        if self.uuid == IP_ADDRESS_CHAR_UUID:
            logger.info(f'*** IP ADDRESS ReadValue RETURNING: {value_str} ***')
        return self.value

    @dbus.service.method(GATT_CHRC_IFACE, in_signature='aya{sv}')
    def WriteValue(self, value, options):
        logger.info(f'=== WriteValue CALLED ===')
        logger.info(f'Characteristic UUID: {self.uuid}')
        logger.info(f'Value length: {len(value)}, options: {options}')
        try:
            self.value = value
            # Handle write in derived classes
            self.handle_write(value)
            logger.info(f'WriteValue completed successfully for {self.uuid}')
        except Exception as e:
            logger.error(f'Error in WriteValue for {self.uuid}: {e}', exc_info=True)
            raise

    def handle_write(self, value):
        """Override in derived classes"""
        pass

    @dbus.service.method(GATT_CHRC_IFACE)
    def StartNotify(self):
        logger.info(f'=== StartNotify CALLED ===')
        logger.info(f'Characteristic UUID: {self.uuid}')
        if self.uuid == IP_ADDRESS_CHAR_UUID:
            logger.info(f'*** IP ADDRESS StartNotify CALLED ***')

    @dbus.service.method(GATT_CHRC_IFACE)
    def StopNotify(self):
        logger.info(f'=== StopNotify CALLED ===')
        logger.info(f'Characteristic UUID: {self.uuid}')
        if self.uuid == IP_ADDRESS_CHAR_UUID:
            logger.info(f'*** IP ADDRESS StopNotify CALLED ***')

    @dbus.service.signal(DBUS_PROP_IFACE,
                         signature='sa{sv}as')
    def PropertiesChanged(self, interface, changed, invalidated):
        pass


class WiFiSSIDCharacteristic(Characteristic):
    """Characteristic for WiFi SSID"""
    
    def __init__(self, bus, index, service, wifi_server):
        Characteristic.__init__(
            self, bus, index,
            WIFI_SSID_CHAR_UUID,
            ['write', 'write-without-response'],
            service)
        self.wifi_server = wifi_server

    def handle_write(self, value):
        try:
            ssid = bytes(value).decode('utf-8').strip()
            logger.info(f"Received SSID: {ssid}")
            self.wifi_server.set_ssid(ssid)
        except Exception as e:
            logger.error(f"Error handling SSID write: {e}")


class WiFiPasswordCharacteristic(Characteristic):
    """Characteristic for WiFi Password"""
    
    def __init__(self, bus, index, service, wifi_server):
        Characteristic.__init__(
            self, bus, index,
            WIFI_PASSWORD_CHAR_UUID,
            ['write', 'write-without-response'],
            service)
        self.wifi_server = wifi_server

    def handle_write(self, value):
        try:
            password = bytes(value).decode('utf-8').strip()
            logger.info("Received password")
            self.wifi_server.set_password(password)
        except Exception as e:
            logger.error(f"Error handling password write: {e}")


class StatusCharacteristic(Characteristic):
    """Characteristic for status notifications"""
    
    def __init__(self, bus, index, service, wifi_server):
        Characteristic.__init__(
            self, bus, index,
            STATUS_CHAR_UUID,
            ['read', 'notify'],
            service)
        self.wifi_server = wifi_server
        idle_bytes = "idle".encode('utf-8')
        self.value = dbus.Array([dbus.Byte(b) for b in idle_bytes], signature=dbus.Signature('y'))

    def update_status(self, status):
        """Update status value and notify"""
        status_bytes = status.encode('utf-8')
        self.value = dbus.Array([dbus.Byte(b) for b in status_bytes], signature=dbus.Signature('y'))
        self.PropertiesChanged(
            GATT_CHRC_IFACE,
            {'Value': self.value},
            [])


class IPAddressCharacteristic(Characteristic):
    """Characteristic for IP address notifications"""
    
    def __init__(self, bus, index, service, wifi_server):
        Characteristic.__init__(
            self, bus, index,
            IP_ADDRESS_CHAR_UUID,
            ['read', 'notify'],
            service)
        self.wifi_server = wifi_server
        # Try to get IP address immediately if available
        initial_ip = get_current_ip_address()
        if initial_ip:
            ip_bytes = initial_ip.encode('utf-8')
            self.value = dbus.Array([dbus.Byte(b) for b in ip_bytes], signature=dbus.Signature('y'))
            logger.info(f'IPAddressCharacteristic initialized with IP: {initial_ip}')
        else:
            self.value = dbus.Array([], signature=dbus.Signature('y'))
            logger.info(f'IPAddressCharacteristic initialized with empty value')

    def update_ip(self, ip):
        """Update IP address value and notify"""
        logger.info(f'IPAddressCharacteristic.update_ip called with IP: {ip}')
        ip_bytes = ip.encode('utf-8')
        self.value = dbus.Array([dbus.Byte(b) for b in ip_bytes], signature=dbus.Signature('y'))
        logger.info(f'IPAddressCharacteristic value updated, length: {len(self.value)}')
        self.PropertiesChanged(
            GATT_CHRC_IFACE,
            {'Value': self.value},
            [])
        logger.info(f'IPAddressCharacteristic PropertiesChanged signal sent')


class WiFiScanCharacteristic(Characteristic):
    """Characteristic for WiFi network scanning"""
    
    def __init__(self, bus, index, service, wifi_server):
        Characteristic.__init__(
            self, bus, index,
            WIFI_SCAN_CHAR_UUID,
            ['read'],
            service)
        self.wifi_server = wifi_server
        self.value = dbus.Array([], signature=dbus.Signature('y'))
    
    @dbus.service.method(GATT_CHRC_IFACE,
                         in_signature='a{sv}',
                         out_signature='ay')
    def ReadValue(self, options):
        """Read WiFi scan results - performs scan and returns JSON list of networks"""
        logger.info('=== WiFiScanCharacteristic.ReadValue CALLED ===')
        
        try:
            # Perform WiFi scan
            logger.info('Starting WiFi scan...')
            networks = scan_wifi_networks()
            logger.info(f'WiFi scan completed, found {len(networks)} networks')
            
            # Limit to top 30 networks to avoid BLE size limits (512 bytes)
            # BLE characteristic read has a limit, so we limit the number of networks
            networks = networks[:30]
            
            # Simplify format - only include essential info to reduce size
            simplified_networks = []
            for net in networks:
                simplified_networks.append({
                    's': net.get('ssid', ''),  # 's' for SSID
                    'g': net.get('signal', 0),  # 'g' for signal
                    'c': net.get('security', '')[:10]  # 'c' for security (truncated)
                })
            
            # Convert to JSON
            json_data = json.dumps(simplified_networks, ensure_ascii=False)
            json_size = len(json_data)
            logger.info(f'WiFi scan JSON size: {json_size} bytes, networks: {len(simplified_networks)}')
            
            # Check if JSON is too large (BLE limit is typically 512 bytes)
            if json_size > 500:
                logger.warning(f'JSON too large ({json_size} bytes), truncating networks')
                # Further reduce if still too large
                while json_size > 500 and len(simplified_networks) > 0:
                    simplified_networks.pop()
                    json_data = json.dumps(simplified_networks, ensure_ascii=False)
                    json_size = len(json_data)
                logger.info(f'Truncated to {len(simplified_networks)} networks, size: {json_size} bytes')
            
            # Convert to byte array using UTF-8 encoding
            json_bytes = json_data.encode('utf-8')
            self.value = dbus.Array([dbus.Byte(b) for b in json_bytes], signature=dbus.Signature('y'))
            logger.info(f'WiFiScanCharacteristic returning {len(self.value)} bytes')
            
            return self.value
        except Exception as e:
            logger.error(f'Error in WiFiScanCharacteristic.ReadValue: {e}', exc_info=True)
            # Return empty array on error
            error_json = json.dumps([{"error": str(e)}], ensure_ascii=False)
            error_bytes = error_json.encode('utf-8')
            self.value = dbus.Array([dbus.Byte(b) for b in error_bytes], signature=dbus.Signature('y'))
            return self.value


class ContainerStatusCharacteristic(Characteristic):
    """Characteristic for checking container status"""
    
    def __init__(self, bus, index, service, wifi_server):
        Characteristic.__init__(
            self, bus, index,
            CONTAINER_STATUS_CHAR_UUID,
            ['read'],
            service)
        self.wifi_server = wifi_server
        self.value = dbus.Array([], signature=dbus.Signature('y'))
    
    @dbus.service.method(GATT_CHRC_IFACE,
                         in_signature='a{sv}',
                         out_signature='ay')
    def ReadValue(self, options):
        """Read container status - checks if both containers are running"""
        logger.info('=== ContainerStatusCharacteristic.ReadValue CALLED ===')
        
        try:
            status = check_containers_status()
            status_json = json.dumps(status, ensure_ascii=False)
            logger.info(f'Container status: {status_json}')
            
            # Convert JSON string to bytes using UTF-8 encoding
            status_bytes = status_json.encode('utf-8')
            self.value = dbus.Array([dbus.Byte(b) for b in status_bytes], signature=dbus.Signature('y'))
            return self.value
        except Exception as e:
            logger.error(f'Error in ContainerStatusCharacteristic.ReadValue: {e}', exc_info=True)
            error_json = json.dumps({"error": str(e), "running": False}, ensure_ascii=False)
            # Convert JSON string to bytes using UTF-8 encoding
            error_bytes = error_json.encode('utf-8')
            self.value = dbus.Array([dbus.Byte(b) for b in error_bytes], signature=dbus.Signature('y'))
            return self.value


class StartContainersCharacteristic(Characteristic):
    """Characteristic for starting containers"""
    
    def __init__(self, bus, index, service, wifi_server):
        Characteristic.__init__(
            self, bus, index,
            START_CONTAINERS_CHAR_UUID,
            ['write', 'write-without-response'],
            service)
        self.wifi_server = wifi_server
    
    def handle_write(self, value):
        """Handle write to start containers"""
        try:
            command = bytes(value).decode('utf-8').strip()
            logger.info(f"Received start containers command: {command}")
            
            if command == "start":
                result = start_containers()
                logger.info(f"Start containers result: {result}")
            else:
                logger.warning(f"Unknown command: {command}")
        except Exception as e:
            logger.error(f"Error handling start containers write: {e}")


class ContainerLogsCharacteristic(Characteristic):
    """Characteristic for reading container logs"""
    
    def __init__(self, bus, index, service, wifi_server):
        Characteristic.__init__(
            self, bus, index,
            CONTAINER_LOGS_CHAR_UUID,
            ['read'],
            service)
        self.wifi_server = wifi_server
        self.value = dbus.Array([], signature=dbus.Signature('y'))
    
    @dbus.service.method(GATT_CHRC_IFACE,
                         in_signature='a{sv}',
                         out_signature='ay')
    def ReadValue(self, options):
        """Read container logs from RPi"""
        logger.info('=== ContainerLogsCharacteristic.ReadValue CALLED ===')
        
        try:
            logs = get_container_logs()
            # Limit log size to avoid BLE size limits (512 bytes)
            # Convert to bytes first to get accurate byte count
            logs_bytes = logs.encode('utf-8')
            if len(logs_bytes) > 500:
                logs_bytes = logs_bytes[-500:]  # Take last 500 bytes
                logger.warning(f'Logs truncated to 500 bytes')
            
            logger.info(f'Returning {len(logs_bytes)} bytes of logs')
            self.value = dbus.Array([dbus.Byte(b) for b in logs_bytes], signature=dbus.Signature('y'))
            return self.value
        except Exception as e:
            logger.error(f'Error in ContainerLogsCharacteristic.ReadValue: {e}', exc_info=True)
            error_msg = f"Error getting logs: {str(e)}"
            # Convert error message to bytes using UTF-8 encoding
            error_bytes = error_msg.encode('utf-8')
            self.value = dbus.Array([dbus.Byte(b) for b in error_bytes], signature=dbus.Signature('y'))
            return self.value


def check_containers_status():
    """
    Check if both scratch containers are running
    
    Returns:
        Dictionary with status information
    """
    INSTALL_DIR = "/opt/scratch-albilab"
    result = {
        "running": False,
        "gui_running": False,
        "backend_running": False,
        "message": ""
    }
    
    try:
        # Try to find the user who owns the installation directory
        # Containers are typically run by the user who owns the install directory
        import pwd
        import stat
        
        try:
            install_stat = os.stat(INSTALL_DIR)
            install_uid = install_stat.st_uid
            install_user = pwd.getpwuid(install_uid).pw_name
            logger.info(f"Install directory owned by user: {install_user}")
        except Exception as e:
            logger.warning(f"Could not determine install directory owner: {e}")
            install_user = None
        
        # Check if containers are running using podman
        # If we're running as root but containers run under another user,
        # try to run podman as that user
        if install_user and os.geteuid() == 0 and install_user != 'root':
            # Running as root, but containers are under another user
            # Try to run podman as that user
            logger.info(f"Running podman as user {install_user}")
            check_result = subprocess.run(
                ['su', '-', install_user, '-c', 'podman ps --format "{{.Names}}"'],
                capture_output=True,
                text=True,
                timeout=5
            )
        else:
            # Run podman normally (as current user)
            check_result = subprocess.run(
                ['podman', 'ps', '--format', '{{.Names}}'],
                capture_output=True,
                text=True,
                timeout=5
            )
        
        if check_result.returncode == 0:
            # Parse output - filter out empty lines and strip whitespace
            running_containers = [line.strip() for line in check_result.stdout.strip().split('\n') if line.strip()]
            logger.info(f"Found running containers: {running_containers}")
            
            # Check for both containers
            result["gui_running"] = any("scratch-gui-app" in name for name in running_containers)
            result["backend_running"] = any("scratch-backend-app" in name for name in running_containers)
            result["running"] = result["gui_running"] and result["backend_running"]
            
            if result["running"]:
                result["message"] = "Scratch služba funguje"
            elif result["gui_running"] or result["backend_running"]:
                result["message"] = "Scratch služba částečně spuštěna"
            else:
                result["message"] = "Scratch služba není spuštěna"
        else:
            result["message"] = f"Chyba při kontrole kontejnerů: {check_result.stderr}"
            logger.error(f"podman ps failed: returncode={check_result.returncode}, stderr={check_result.stderr}, stdout={check_result.stdout}")
    except Exception as e:
        result["message"] = f"Chyba při kontrole kontejnerů: {str(e)}"
        logger.error(result["message"], exc_info=True)
    
    return result


def start_containers():
    """
    Start scratch containers using podman-compose-wrapper.sh
    Note: Must run as user 'pi' (not root!), because podman runs rootless
    
    Returns:
        Dictionary with result information
    """
    INSTALL_DIR = "/opt/scratch-albilab"
    WRAPPER_SCRIPT = f"{INSTALL_DIR}/podman-compose-wrapper.sh"
    service_user = 'pi'  # Service runs under user 'pi'
    result = {
        "success": False,
        "message": "",
        "logs": ""
    }
    
    try:
        # Check if wrapper script exists
        if not os.path.exists(WRAPPER_SCRIPT):
            result["message"] = "Wrapper script not found"
            logger.error(result["message"])
            return result
        
        # Start containers using wrapper script as user 'pi' (not root!)
        # Wrapper script internally calls podman-compose, which must run as non-root
        logger.info(f"Starting containers as user: {service_user}")
        start_result = subprocess.run(
            ['su', '-', service_user, '-c', f'{WRAPPER_SCRIPT} start'],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        result["logs"] = start_result.stdout + start_result.stderr
        
        if start_result.returncode == 0:
            result["success"] = True
            result["message"] = "Kontejnery byly spuštěny"
            logger.info(result["message"])
        else:
            result["message"] = f"Chyba při spouštění kontejnerů: {start_result.stderr}"
            logger.error(result["message"])
    except subprocess.TimeoutExpired:
        result["message"] = "Timeout při spouštění kontejnerů"
        logger.error(result["message"])
    except Exception as e:
        result["message"] = f"Chyba při spouštění kontejnerů: {str(e)}"
        logger.error(result["message"], exc_info=True)
    
    return result


def get_container_logs():
    """
    Get logs from container monitoring and wrapper script
    
    Returns:
        String with logs
    """
    INSTALL_DIR = "/opt/scratch-albilab"
    LOG_FILES = [
        f"{INSTALL_DIR}/container-monitor.log",
        f"{INSTALL_DIR}/update-check.log"
    ]
    
    logs = []
    logs.append(f"=== Container Logs from RPi ===\n")
    logs.append(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    
    # Get container status
    try:
        status_result = subprocess.run(
            ['podman', 'ps', '-a', '--format', '{{.Names}}: {{.Status}}'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if status_result.returncode == 0:
            logs.append("Container Status:\n")
            logs.append(status_result.stdout)
            logs.append("\n")
    except Exception as e:
        logs.append(f"Error getting container status: {str(e)}\n")
    
    # Read log files
    for log_file in LOG_FILES:
        if os.path.exists(log_file):
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    file_content = f.read()
                    # Get last 50 lines
                    lines = file_content.split('\n')
                    last_lines = '\n'.join(lines[-50:])
                    logs.append(f"=== {os.path.basename(log_file)} (last 50 lines) ===\n")
                    logs.append(last_lines)
                    logs.append("\n")
            except Exception as e:
                logs.append(f"Error reading {log_file}: {str(e)}\n")
    
    # Get recent journalctl logs for scratch services
    try:
        journal_result = subprocess.run(
            ['journalctl', '-u', 'scratch-albilab.service', '-n', '20', '--no-pager'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if journal_result.returncode == 0:
            logs.append("=== Systemd Service Logs (last 20 lines) ===\n")
            logs.append(journal_result.stdout)
            logs.append("\n")
    except Exception as e:
        logs.append(f"Error getting journalctl logs: {str(e)}\n")
    
    return ''.join(logs)


class WiFiConfigServer:
    """BLE Server for WiFi configuration"""
    
    def __init__(self):
        self.ssid = ""
        self.password = ""
        self.status = "idle"
        self.ip_address = ""
        self.status_char = None
        self.ip_char = None
        self.config_thread = None
        
    def initialize_ip_address(self):
        """Initialize IP address from current network connection"""
        current_ip = get_current_ip_address()
        if current_ip:
            self.ip_address = current_ip
            logger.info(f"Found existing IP address: {current_ip}")
            if self.ip_char:
                logger.info(f"Updating IP address characteristic with: {current_ip}")
                self.ip_char.update_ip(current_ip)
                logger.info(f"IP address characteristic updated")
            else:
                logger.warning("ip_char is None, cannot update IP address characteristic")
            return True
        else:
            logger.info("No IP address found on any interface")
            return False

    def set_ssid(self, ssid):
        """Set SSID and trigger configuration if password is also set"""
        self.ssid = ssid
        if self.ssid and self.password:
            self._configure_wifi()

    def set_password(self, password):
        """Set password and trigger configuration if SSID is also set"""
        self.password = password
        if self.ssid and self.password:
            self._configure_wifi()

    def _configure_wifi(self):
        """Configure WiFi in a separate thread"""
        if self.config_thread and self.config_thread.is_alive():
            return
        
        self.config_thread = threading.Thread(target=self._do_configure_wifi)
        self.config_thread.start()

    def _do_configure_wifi(self):
        """Actually configure WiFi (runs in thread)"""
        if self.status_char:
            self.status_char.update_status("configuring")
        
        success, ip_address = configure_wifi(self.ssid, self.password)
        
        if success:
            self.ip_address = ip_address
            if self.status_char:
                self.status_char.update_status("success")
            if self.ip_char:
                self.ip_char.update_ip(ip_address)
            logger.info(f"WiFi configured successfully. IP: {ip_address}")
            
            # After successful WiFi configuration, restart containers
            # This is important because on first boot, containers may not have started
            # due to missing network connection
            logger.info("WiFi configured - restarting containers to ensure they're running...")
            try:
                # Wait a moment for network to stabilize
                time.sleep(3)
                
                # Service runs under user 'pi' (not root!)
                # Podman must run as non-root user
                service_user = 'pi'
                
                # First, clean up broken pods and containers (like install.sh does)
                # This is important because podman-compose can leave broken pods
                # But we must run podman commands as the service user, not root!
                logger.info("Cleaning up broken pods and containers...")
                try:
                    # Remove all pods (podman-compose creates pods that can cause issues)
                    # Run as service user 'pi', not root
                    pod_list_result = subprocess.run(
                        ['su', '-', service_user, '-c', 'podman pod ls -q'],
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    if pod_list_result.returncode == 0 and pod_list_result.stdout.strip():
                        for pod_id in pod_list_result.stdout.strip().split('\n'):
                            if pod_id.strip():
                                logger.info(f"Removing pod: {pod_id}")
                                subprocess.run(
                                    ['su', '-', service_user, '-c', f'podman pod rm -f {pod_id.strip()}'],
                                    capture_output=True,
                                    timeout=10
                                )
                    
                    # Remove any existing containers (as service user 'pi')
                    subprocess.run(
                        ['su', '-', service_user, '-c', 'podman rm -f scratch-gui-app scratch-backend-app'],
                        capture_output=True,
                        timeout=10
                    )
                    logger.info("Cleanup completed")
                except Exception as cleanup_error:
                    logger.warning(f"Cleanup warning (non-fatal): {cleanup_error}")
                
                # Stop any existing compose setup (as service user 'pi')
                logger.info("Stopping existing compose setup...")
                subprocess.run(
                    ['su', '-', service_user, '-c', 'cd /opt/scratch-albilab && podman-compose down'],
                    capture_output=True,
                    timeout=30
                )
                
                # Restart systemd service (which will restart containers with clean state)
                # This is the safest way - systemd service runs under user 'pi'
                logger.info("Restarting systemd service...")
                restart_result = subprocess.run(
                    ['systemctl', 'restart', 'scratch-albilab.service'],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if restart_result.returncode == 0:
                    logger.info("Containers restarted successfully after WiFi configuration")
                    # Wait a bit and verify containers are running
                    time.sleep(5)
                    # Check as service user 'pi'
                    verify_result = subprocess.run(
                        ['su', '-', service_user, '-c', 'podman ps --format "{{.Names}}"'],
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    
                    if verify_result.returncode == 0:
                        running_containers = [line.strip() for line in verify_result.stdout.strip().split('\n') if line.strip()]
                        if any('scratch-gui-app' in name or 'scratch-backend-app' in name for name in running_containers):
                            logger.info(f"Verified: Containers are running: {running_containers}")
                        else:
                            logger.warning("Containers may not be running after restart")
                else:
                    logger.warning(f"Failed to restart containers via systemctl: {restart_result.stderr}")
                    logger.error("Systemctl restart failed - manual intervention may be required")
            except Exception as e:
                logger.error(f"Error restarting containers after WiFi configuration: {e}", exc_info=True)
        else:
            if self.status_char:
                self.status_char.update_status("error")
            logger.error("WiFi configuration failed")


def register_app_cb():
    """Callback for app registration"""
    logger.info('GATT application registered')


def register_app_error_cb(error):
    """Error callback for app registration"""
    logger.error(f'Failed to register application: {error}')
    mainloop.quit()


def register_ad_cb():
    """Callback for advertisement registration"""
    logger.info('Advertisement registered')


def register_ad_error_cb(error):
    """Error callback for advertisement registration"""
    logger.error(f'Failed to register advertisement: {error}')


def ensure_bluetooth_powered(bus, adapter_path):
    """Ensure Bluetooth adapter is powered on"""
    try:
        adapter_props = dbus.Interface(
            bus.get_object(BLUEZ_SERVICE_NAME, adapter_path),
            DBUS_PROP_IFACE)
        
        powered = adapter_props.Get(ADAPTER_IFACE, 'Powered')
        
        if not powered:
            logger.info("Bluetooth adapter is powered off. Attempting to power on...")
            
            # First, try to unblock with rfkill (in case it's soft-blocked)
            try:
                logger.info("Unblocking Bluetooth with rfkill...")
                result = subprocess.run(
                    ['rfkill', 'unblock', 'all'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    logger.info("rfkill unblock successful")
                    time.sleep(1)
                else:
                    logger.warning(f"rfkill unblock failed: {result.stderr}")
            except FileNotFoundError:
                logger.warning("rfkill not found, skipping unblock step")
            except Exception as rfkill_error:
                logger.warning(f"rfkill unblock error: {rfkill_error}")
            
            # Try D-Bus method
            try:
                adapter_props.Set(ADAPTER_IFACE, 'Powered', dbus.Boolean(True))
                logger.info("Bluetooth adapter powered on via D-Bus")
                time.sleep(2)
            except Exception as dbus_error:
                logger.warning(f"D-Bus method failed: {dbus_error}")
                logger.info("Trying alternative method using hciconfig...")
                
                # Try hciconfig as fallback
                try:
                    result = subprocess.run(
                        ['hciconfig', 'hci0', 'up'],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    if result.returncode == 0:
                        logger.info("Bluetooth adapter powered on via hciconfig")
                        time.sleep(2)
                    else:
                        logger.warning(f"hciconfig failed: {result.stderr}")
                        # Try bluetoothctl as last resort
                        logger.info("Trying bluetoothctl...")
                        result = subprocess.run(
                            ['bluetoothctl', 'power', 'on'],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                        if result.returncode == 0:
                            logger.info("Bluetooth adapter powered on via bluetoothctl")
                            time.sleep(2)
                        else:
                            logger.error(f"bluetoothctl failed: {result.stderr}")
                            logger.error("Could not power on Bluetooth adapter. Please run manually:")
                            logger.error("  sudo rfkill unblock all")
                            logger.error("  sudo hciconfig hci0 up")
                            logger.error("  or")
                            logger.error("  sudo bluetoothctl power on")
                            return False
                except FileNotFoundError:
                    logger.error("Neither hciconfig nor bluetoothctl found. Please install bluez-utils:")
                    logger.error("  sudo apt-get install bluez-utils")
                    return False
                except subprocess.TimeoutExpired:
                    logger.error("Command timed out")
                    return False
                except Exception as cmd_error:
                    logger.error(f"Command execution failed: {cmd_error}")
                    return False
        else:
            logger.info("Bluetooth adapter is already powered on")
            
        # Verify it's actually powered on
        try:
            powered = adapter_props.Get(ADAPTER_IFACE, 'Powered')
            if not powered:
                logger.warning("Bluetooth adapter still appears to be powered off")
                return False
        except Exception as e:
            logger.warning(f"Could not verify Bluetooth power state: {e}")
            
        # Also ensure it's discoverable
        try:
            discoverable = adapter_props.Get(ADAPTER_IFACE, 'Discoverable')
            if not discoverable:
                logger.info("Making Bluetooth adapter discoverable...")
                adapter_props.Set(ADAPTER_IFACE, 'Discoverable', dbus.Boolean(True))
                logger.info("Bluetooth adapter is now discoverable")
        except Exception as e:
            logger.warning(f"Could not set discoverable: {e}")
            
        return True
    except Exception as e:
        logger.error(f"Could not ensure Bluetooth is powered: {e}")
        logger.error("Please ensure Bluetooth is enabled manually:")
        logger.error("  sudo hciconfig hci0 up")
        logger.error("  sudo hciconfig hci0 piscan")
        return False


def main():
    """Main function"""
    global mainloop
    
    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    
    bus = dbus.SystemBus()
    
    # Get adapter
    adapter = None
    try:
        om = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, '/'),
                            DBUS_OM_IFACE)
        objects = om.GetManagedObjects()
        
        for path, interfaces in objects.items():
            if GATT_MANAGER_IFACE in interfaces:
                adapter = path
                break
        
        if not adapter:
            logger.error("No GATT Manager found")
            return
            
        # Ensure Bluetooth is powered on
        ensure_bluetooth_powered(bus, adapter)
        
    except Exception as e:
        logger.error(f"Error finding adapter: {e}")
        return
    
    # Create WiFi config server
    wifi_server = WiFiConfigServer()
    
    # Create service
    service = Service(bus, 0, WIFI_CONFIG_SERVICE_UUID, True)
    
    # Add characteristics
    ssid_char = WiFiSSIDCharacteristic(bus, 0, service, wifi_server)
    password_char = WiFiPasswordCharacteristic(bus, 1, service, wifi_server)
    status_char = StatusCharacteristic(bus, 2, service, wifi_server)
    ip_char = IPAddressCharacteristic(bus, 3, service, wifi_server)
    scan_char = WiFiScanCharacteristic(bus, 4, service, wifi_server)
    container_status_char = ContainerStatusCharacteristic(bus, 5, service, wifi_server)
    start_containers_char = StartContainersCharacteristic(bus, 6, service, wifi_server)
    container_logs_char = ContainerLogsCharacteristic(bus, 7, service, wifi_server)
    
    logger.info(f"Created characteristics:")
    logger.info(f"  SSID: {WIFI_SSID_CHAR_UUID}")
    logger.info(f"  Password: {WIFI_PASSWORD_CHAR_UUID}")
    logger.info(f"  Status: {STATUS_CHAR_UUID}")
    logger.info(f"  IP Address: {IP_ADDRESS_CHAR_UUID}")
    logger.info(f"  WiFi Scan: {WIFI_SCAN_CHAR_UUID}")
    logger.info(f"  Container Status: {CONTAINER_STATUS_CHAR_UUID}")
    logger.info(f"  Start Containers: {START_CONTAINERS_CHAR_UUID}")
    logger.info(f"  Container Logs: {CONTAINER_LOGS_CHAR_UUID}")
    
    wifi_server.status_char = status_char
    wifi_server.ip_char = ip_char
    
    service.add_characteristic(ssid_char)
    service.add_characteristic(password_char)
    service.add_characteristic(status_char)
    service.add_characteristic(ip_char)
    service.add_characteristic(scan_char)
    service.add_characteristic(container_status_char)
    service.add_characteristic(start_containers_char)
    service.add_characteristic(container_logs_char)
    
    logger.info(f"Added {len(service.characteristics)} characteristics to service")
    
    # Initialize IP address if already connected
    wifi_server.initialize_ip_address()
    
    # Create application
    app = Application(bus)
    app.add_service(service)
    
    # Register application
    service_manager = dbus.Interface(
        bus.get_object(BLUEZ_SERVICE_NAME, adapter),
        GATT_MANAGER_IFACE)
    
    service_manager.RegisterApplication(app.get_path(), {},
                                       reply_handler=register_app_cb,
                                       error_handler=register_app_error_cb)
    
    # Register advertisement
    try:
        ad_manager = dbus.Interface(
            bus.get_object(BLUEZ_SERVICE_NAME, adapter),
            LE_ADVERTISING_MANAGER_IFACE)
        
        advertisement = Advertisement(bus, 0, WIFI_CONFIG_SERVICE_UUID)
        ad_manager.RegisterAdvertisement(advertisement.get_path(), {},
                                        reply_handler=register_ad_cb,
                                        error_handler=register_ad_error_cb)
        logger.info('Advertisement registered')
    except Exception as e:
        logger.warning(f'Failed to register advertisement (may not be critical): {e}')
    
    logger.info("BLE WiFi Config Server started")
    logger.info(f"Service UUID: {WIFI_CONFIG_SERVICE_UUID}")
    
    # Run main loop
    mainloop = GLib.MainLoop()
    try:
        mainloop.run()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        mainloop.quit()


if __name__ == "__main__":
    main()