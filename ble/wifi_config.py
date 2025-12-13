#!/usr/bin/env python3
"""
WiFi Configuration Handler for Raspberry Pi
Handles writing WiFi credentials to wpa_supplicant and retrieving IP address
"""

import subprocess
import time
import re
import os
import json


def write_wifi_config(ssid: str, password: str) -> bool:
    """
    Write WiFi configuration to wpa_supplicant.conf
    
    Args:
        ssid: WiFi network SSID
        password: WiFi network password
        
    Returns:
        True if successful, False otherwise
    """
    if not ssid or not password:
        return False
    
    if len(ssid) > 32:
        return False
    
    if len(password) < 8 or len(password) > 63:
        return False
    
    wpa_supplicant_path = "/etc/wpa_supplicant/wpa_supplicant.conf"
    
    # Read existing config
    try:
        with open(wpa_supplicant_path, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        content = "country=CZ\nctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\nupdate_config=1\n"
    
    # Remove existing network with same SSID if present
    pattern = r'network=\{[^}]*ssid="' + re.escape(ssid) + r'"[^}]*\}'
    content = re.sub(pattern, '', content, flags=re.DOTALL)
    
    # Add new network configuration
    network_config = f'\nnetwork={{\n    ssid="{ssid}"\n    psk="{password}"\n    key_mgmt=WPA-PSK\n}}\n'
    content += network_config
    
    # Write back to file (requires root)
    try:
        with open(wpa_supplicant_path, 'w') as f:
            f.write(content)
        return True
    except PermissionError:
        print("Error: Need root privileges to write to wpa_supplicant.conf")
        return False
    except Exception as e:
        print(f"Error writing WiFi config: {e}")
        return False


def delete_all_wifi_networks() -> bool:
    """
    Delete all saved WiFi networks from both wpa_supplicant and NetworkManager
    
    This function removes WiFi configurations from:
    1. /etc/wpa_supplicant/wpa_supplicant.conf (removes all network blocks)
    2. NetworkManager connections (if NetworkManager is active)
    3. wpa_cli networks (if wpa_supplicant is running)
    
    Returns:
        True if successful, False otherwise
    """
    print("Deleting all saved WiFi networks...")
    success = True
    
    # 1. Delete from wpa_supplicant.conf
    wpa_supplicant_path = "/etc/wpa_supplicant/wpa_supplicant.conf"
    try:
        # Read existing config
        try:
            with open(wpa_supplicant_path, 'r') as f:
                content = f.read()
        except FileNotFoundError:
            print("wpa_supplicant.conf not found, nothing to delete")
            content = None
        
        if content:
            # Remove all network blocks
            # Pattern matches: network={ ... } where ... can contain newlines
            pattern = r'network=\{[^}]*\}' + r'(?:\s*network=\{[^}]*\})*'
            # Better pattern: match each network block individually
            pattern = r'network=\{[^}]*?\}'
            original_content = content
            content = re.sub(pattern, '', content, flags=re.DOTALL)
            
            # Clean up extra newlines
            content = re.sub(r'\n\n+', '\n\n', content)
            content = content.strip() + '\n'
            
            # If content changed, write it back
            if content != original_content:
                # Ensure we keep the header (country, ctrl_interface, update_config)
                if 'country=' not in content:
                    content = "country=CZ\nctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\nupdate_config=1\n"
                elif 'ctrl_interface=' not in content:
                    # Add ctrl_interface if missing
                    if not content.endswith('\n'):
                        content += '\n'
                    content += "ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\nupdate_config=1\n"
                
                with open(wpa_supplicant_path, 'w') as f:
                    f.write(content)
                print("✓ Deleted all networks from wpa_supplicant.conf")
            else:
                print("✓ No networks found in wpa_supplicant.conf")
    except PermissionError:
        print("ERROR: Need root privileges to modify wpa_supplicant.conf")
        success = False
    except Exception as e:
        print(f"ERROR: Failed to delete from wpa_supplicant.conf: {e}")
        success = False
    
    # 2. Delete from wpa_cli (if wpa_supplicant is running)
    try:
        # List all networks
        list_result = subprocess.run(
            ['sudo', 'wpa_cli', '-i', 'wlan0', 'list_networks'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if list_result.returncode == 0:
            lines = list_result.stdout.strip().split('\n')
            # First line is header, rest are networks
            if len(lines) > 1:
                network_ids = []
                for line in lines[1:]:
                    # Network ID is the first field
                    parts = line.split('\t')
                    if parts:
                        try:
                            network_id = int(parts[0])
                            network_ids.append(network_id)
                        except (ValueError, IndexError):
                            continue
                
                # Delete each network
                for network_id in network_ids:
                    delete_result = subprocess.run(
                        ['sudo', 'wpa_cli', '-i', 'wlan0', 'remove_network', str(network_id)],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    if delete_result.returncode == 0 and 'OK' in delete_result.stdout:
                        print(f"✓ Deleted network {network_id} from wpa_cli")
                
                # Save configuration
                save_result = subprocess.run(
                    ['sudo', 'wpa_cli', '-i', 'wlan0', 'save_config'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if save_result.returncode == 0:
                    print("✓ Saved wpa_cli configuration")
            else:
                print("✓ No networks found in wpa_cli")
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
        # wpa_cli might not be available or wpa_supplicant not running
        print(f"Note: Could not delete from wpa_cli: {e}")
    
    # 3. Delete from NetworkManager (if active)
    try:
        # Check if NetworkManager is active
        nm_check = subprocess.run(
            ['systemctl', 'is-active', '--quiet', 'NetworkManager'],
            timeout=2
        )
        if nm_check.returncode == 0:
            # List all WiFi connections
            list_result = subprocess.run(
                ['sudo', 'nmcli', 'connection', 'show'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if list_result.returncode == 0:
                lines = list_result.stdout.strip().split('\n')
                wifi_connections = []
                for line in lines[1:]:  # Skip header
                    parts = line.split()
                    if parts:
                        conn_name = parts[0]
                        conn_type = parts[1] if len(parts) > 1 else ''
                        if conn_type == 'wifi' or '802-11-wireless' in line:
                            wifi_connections.append(conn_name)
                
                # Delete each WiFi connection
                for conn_name in wifi_connections:
                    delete_result = subprocess.run(
                        ['sudo', 'nmcli', 'connection', 'delete', conn_name],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    if delete_result.returncode == 0:
                        print(f"✓ Deleted NetworkManager connection: {conn_name}")
                    else:
                        print(f"⚠ Failed to delete NetworkManager connection: {conn_name}")
                
                if not wifi_connections:
                    print("✓ No WiFi connections found in NetworkManager")
            else:
                print("Note: Could not list NetworkManager connections")
        else:
            print("✓ NetworkManager is not active, skipping")
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
        print(f"Note: Could not delete from NetworkManager: {e}")
    
    # 4. Also check NetworkManager system-connections directory
    nm_connections_dir = "/etc/NetworkManager/system-connections"
    try:
        if os.path.exists(nm_connections_dir):
            files = os.listdir(nm_connections_dir)
            wifi_files = [f for f in files if f.endswith('.nmconnection') or not f.endswith('.nmmeta')]
            deleted_count = 0
            for filename in wifi_files:
                filepath = os.path.join(nm_connections_dir, filename)
                try:
                    # Read file to check if it's a WiFi connection
                    with open(filepath, 'r') as f:
                        content = f.read()
                        if 'type=wifi' in content or '802-11-wireless' in content:
                            os.remove(filepath)
                            deleted_count += 1
                            print(f"✓ Deleted NetworkManager file: {filename}")
                except Exception as e:
                    print(f"⚠ Could not delete {filename}: {e}")
            
            if deleted_count == 0:
                print("✓ No WiFi connection files found in NetworkManager directory")
    except PermissionError:
        print("Note: Need root privileges to delete NetworkManager connection files")
    except Exception as e:
        print(f"Note: Could not access NetworkManager directory: {e}")
    
    if success:
        print("✓ All WiFi networks deleted successfully")
    else:
        print("⚠ Some operations failed, but partial cleanup completed")
    
    return success


def restart_wifi() -> bool:
    """
    Restart WiFi service to apply new configuration
    Uses the recommended approach: wpa_cli reconfigure (preferred)
    Falls back to service restarts if needed
    
    Based on Raspberry Pi OS documentation:
    - Bookworm (2023+) uses NetworkManager by default
    - Older versions use dhcpcd
    - wpa_cli reconfigure is the preferred method (no service restart needed)
    
    Returns:
        True if at least wpa_supplicant was reconfigured/restarted, False otherwise
    """
    success = False
    
    # Method 1: Use wpa_cli to reconfigure (PREFERRED METHOD)
    # This is the recommended way - reconfigures wpa_supplicant without service restart
    try:
        result = subprocess.run(
            ['sudo', 'wpa_cli', '-i', 'wlan0', 'reconfigure'],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            # Check for OK in output (wpa_cli returns "OK" on success)
            if 'OK' in result.stdout or result.returncode == 0:
                print("WiFi reconfigured using wpa_cli (preferred method)")
                success = True
                time.sleep(2)  # Give time for reconfiguration
                # If wpa_cli succeeded, we're done - no need to restart services
                return True
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
        print(f"wpa_cli reconfigure failed: {e}")
    
    # Method 2: Restart wpa_supplicant service (fallback if wpa_cli failed)
    try:
        # Check if wpa_supplicant is running first
        check_result = subprocess.run(
            ['systemctl', 'is-active', 'wpa_supplicant'],
            capture_output=True,
            text=True,
            timeout=3
        )
        if check_result.returncode == 0:
            subprocess.run(['sudo', 'systemctl', 'restart', 'wpa_supplicant'], 
                          check=True, timeout=10)
            print("wpa_supplicant service restarted")
            success = True
            time.sleep(2)
        else:
            # wpa_supplicant might not be running, try to start it
            print("wpa_supplicant is not active, attempting to start it...")
            try:
                subprocess.run(['sudo', 'systemctl', 'start', 'wpa_supplicant'], 
                              check=True, timeout=10)
                print("wpa_supplicant service started")
                success = True
                time.sleep(2)
            except subprocess.CalledProcessError as e2:
                print(f"Failed to start wpa_supplicant: {e2}")
                # If NetworkManager is active, wpa_supplicant might be managed by it
                print("Note: If NetworkManager is active, it may manage wpa_supplicant")
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
        print(f"Failed to restart wpa_supplicant: {e}")
    
    # Method 3: Detect and restart the active network manager
    # Check which network manager is active and restart it
    network_managers = [
        ('NetworkManager', 'NetworkManager'),  # Raspberry Pi OS Bookworm+ default
        ('dhcpcd', 'dhcpcd'),                   # Older Raspberry Pi OS versions
        ('systemd-networkd', 'systemd-networkd')  # Alternative
    ]
    
    network_manager_restarted = False
    network_manager_name = None
    for service_name, display_name in network_managers:
        try:
            # Check if service exists and is active
            check_result = subprocess.run(
                ['systemctl', 'is-active', '--quiet', service_name],
                timeout=2
            )
            if check_result.returncode == 0:
                # Service is active, restart it
                subprocess.run(['sudo', 'systemctl', 'restart', service_name], 
                              check=True, timeout=10)
                print(f"{display_name} restarted (detected as active)")
                network_manager_restarted = True
                network_manager_name = display_name
                time.sleep(2)  # Give more time after NetworkManager restart
                
                # If NetworkManager is active, ensure interface is UP after restart
                if service_name == 'NetworkManager':
                    print("NetworkManager restarted - ensuring wlan0 is UP...")
                    try:
                        # NetworkManager should manage the interface, but ensure it's up
                        subprocess.run(['sudo', 'ip', 'link', 'set', 'wlan0', 'up'], 
                                     timeout=5)
                        time.sleep(1)
                        # Also try nmcli to ensure WiFi is enabled
                        subprocess.run(['sudo', 'nmcli', 'radio', 'wifi', 'on'], 
                                     timeout=5)
                        print("✓ WiFi radio enabled via NetworkManager")
                    except Exception as e:
                        print(f"Note: Could not explicitly enable WiFi via NetworkManager: {e}")
                break
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            # Service not active or doesn't exist, try next
            continue
    
    if not network_manager_restarted:
        print("No active network manager service found to restart (this is OK)")
    
    # Success if wpa_supplicant was reconfigured or restarted
    # Network manager restart is optional - DHCP will be handled automatically
    return success


def get_ip_address(interface: str = "wlan0", timeout: int = 60) -> str:
    """
    Get IP address from network interface
    
    Args:
        interface: Network interface name (default: wlan0)
        timeout: Maximum time to wait for IP address in seconds (increased to 60 for WiFi connection)
        
    Returns:
        IP address as string, or empty string if not found
    """
    print(f"Waiting for IP address on {interface} (timeout: {timeout}s)...")
    start_time = time.time()
    check_count = 0
    
    while time.time() - start_time < timeout:
        try:
            check_count += 1
            # Use ip command to get IP address
            result = subprocess.run(
                ['ip', 'addr', 'show', interface],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                # Extract IPv4 address using regex
                pattern = r'inet\s+(\d+\.\d+\.\d+\.\d+)/\d+'
                match = re.search(pattern, result.stdout)
                if match:
                    ip = match.group(1)
                    if ip and ip != "127.0.0.1":
                        elapsed = int(time.time() - start_time)
                        print(f"IP address obtained: {ip} (after {elapsed}s, {check_count} checks)")
                        return ip
            
            # Log progress every 5 seconds
            elapsed = int(time.time() - start_time)
            if check_count % 5 == 0:
                print(f"Still waiting for IP address... ({elapsed}s elapsed)")
            
            time.sleep(1)
        except subprocess.TimeoutExpired:
            continue
        except Exception as e:
            print(f"Error getting IP address: {e}")
            time.sleep(1)
    
    elapsed = int(time.time() - start_time)
    print(f"Timeout waiting for IP address after {elapsed}s ({check_count} checks)")
    return ""


def get_current_ip_address() -> str:
    """
    Get current IP address from any active network interface
    Checks eth0 first (ethernet), then wlan0 (WiFi)
    
    Returns:
        IP address as string, or empty string if not found
    """
    # Check common interfaces in order of preference
    interfaces = ["eth0", "wlan0", "usb0"]
    
    for interface in interfaces:
        try:
            # Use ip command to get IP address
            result = subprocess.run(
                ['ip', 'addr', 'show', interface],
                capture_output=True,
                text=True,
                timeout=2
            )
            
            if result.returncode == 0:
                # Extract IPv4 address using regex
                pattern = r'inet\s+(\d+\.\d+\.\d+\.\d+)/\d+'
                match = re.search(pattern, result.stdout)
                if match:
                    ip = match.group(1)
                    if ip and ip != "127.0.0.1":
                        return ip
        except subprocess.TimeoutExpired:
            continue
        except Exception as e:
            # Interface might not exist, continue to next
            continue
    
    return ""


def scan_wifi_networks() -> list:
    """
    Scan for available WiFi networks
    
    Returns:
        List of dictionaries with SSID, signal strength, and security info
        Format: [{"ssid": "NetworkName", "signal": -50, "security": "WPA2"}, ...]
    """
    networks = []
    
    # Try NetworkManager first (Raspberry Pi OS Bookworm+)
    try:
        result = subprocess.run(
            ['nmcli', '-t', '-f', 'SSID,SIGNAL,SECURITY', 'device', 'wifi', 'list'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            for line in result.stdout.strip().split('\n'):
                if not line:
                    continue
                parts = line.split(':')
                if len(parts) >= 3:
                    ssid = parts[0].strip()
                    if ssid and ssid != '--':  # Skip empty SSIDs
                        try:
                            signal = int(parts[1].strip())
                        except (ValueError, IndexError):
                            signal = 0
                        security = parts[2].strip() if len(parts) > 2 else ''
                        
                        # Avoid duplicates
                        if not any(n['ssid'] == ssid for n in networks):
                            networks.append({
                                'ssid': ssid,
                                'signal': signal,
                                'security': security
                            })
            
            if networks:
                # Sort by signal strength (descending)
                networks.sort(key=lambda x: x['signal'], reverse=True)
                return networks
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    except Exception as e:
        print(f"Error scanning with nmcli: {e}")
    
    # Fallback to wpa_cli (older Raspberry Pi OS)
    try:
        # Start scan
        scan_result = subprocess.run(
            ['sudo', 'wpa_cli', '-i', 'wlan0', 'scan'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if scan_result.returncode == 0:
            # Wait for scan to complete
            time.sleep(3)
            
            # Get scan results
            list_result = subprocess.run(
                ['sudo', 'wpa_cli', '-i', 'wlan0', 'scan_results'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if list_result.returncode == 0:
                seen_ssids = set()
                for line in list_result.stdout.strip().split('\n')[1:]:  # Skip header
                    if not line.strip():
                        continue
                    
                    # Format: bssid frequency signal_level flags ssid
                    parts = line.split('\t')
                    if len(parts) >= 5:
                        try:
                            signal = int(parts[2])
                            ssid = parts[4].strip()
                            
                            if ssid and ssid not in seen_ssids:
                                seen_ssids.add(ssid)
                                
                                # Determine security from flags
                                flags = parts[3] if len(parts) > 3 else ''
                                security = 'WPA2' if 'WPA2' in flags else ('WPA' if 'WPA' in flags else 'Open')
                                
                                networks.append({
                                    'ssid': ssid,
                                    'signal': signal,
                                    'security': security
                                })
                        except (ValueError, IndexError):
                            continue
                
                # Sort by signal strength (descending)
                networks.sort(key=lambda x: x['signal'], reverse=True)
                return networks
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    except Exception as e:
        print(f"Error scanning with wpa_cli: {e}")
    
    return networks


def ensure_wifi_enabled() -> bool:
    """
    Ensure WiFi interface is enabled and powered on
    
    Returns:
        True if WiFi is enabled, False otherwise
    """
    interface = "wlan0"
    
    print(f"Checking if WiFi interface {interface} is enabled...")
    
    # First, check and unblock WiFi with rfkill (in case it's soft/hard blocked)
    try:
        rfkill_result = subprocess.run(
            ['rfkill', 'list', 'wifi'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if rfkill_result.returncode == 0:
            rfkill_output = rfkill_result.stdout
            print(f"rfkill status:\n{rfkill_output}")
            # Check if WiFi is blocked
            if ' blocked: yes' in rfkill_output or ': blocked' in rfkill_output:
                print("⚠ WiFi is blocked, attempting to unblock...")
                try:
                    subprocess.run(['sudo', 'rfkill', 'unblock', 'wifi'], 
                                 check=True, timeout=5)
                    print("✓ WiFi unblocked with rfkill")
                    time.sleep(2)  # Give time for unblock to take effect
                except subprocess.CalledProcessError as e:
                    print(f"ERROR: Failed to unblock WiFi with rfkill: {e}")
                    return False
            else:
                print("✓ WiFi is not blocked")
    except FileNotFoundError:
        print("rfkill not found (may not be installed, continuing...)")
    except Exception as e:
        print(f"Could not check rfkill status: {e}")
    
    # Check if interface exists
    try:
        result = subprocess.run(
            ['ip', 'link', 'show', interface],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode != 0:
            print(f"ERROR: Interface {interface} does not exist")
            return False
        
        print(f"Interface {interface} details:\n{result.stdout}")
        
        # Check if interface is UP
        if 'state UP' in result.stdout:
            print(f"✓ WiFi interface {interface} is UP")
            return True
        elif 'state DOWN' in result.stdout:
            print(f"⚠ WiFi interface {interface} is DOWN, attempting to bring it UP...")
            
            # Bring interface UP
            try:
                subprocess.run(['sudo', 'ip', 'link', 'set', interface, 'up'], 
                             check=True, timeout=5)
                print(f"✓ WiFi interface {interface} brought UP")
                time.sleep(2)
                
                # Verify it's actually UP now
                verify_result = subprocess.run(
                    ['ip', 'link', 'show', interface],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if 'state UP' in verify_result.stdout:
                    print(f"✓ Verified: WiFi interface {interface} is now UP")
                    return True
                else:
                    print(f"⚠ Warning: Interface {interface} may not be fully UP")
                    return True  # Still return True, let it try
            except subprocess.CalledProcessError as e:
                print(f"ERROR: Failed to bring {interface} UP: {e}")
                return False
        else:
            print(f"⚠ Unknown interface state: {result.stdout}")
            return False
            
    except Exception as e:
        print(f"ERROR: Could not check WiFi interface status: {e}")
        return False


def configure_wifi_with_networkmanager(ssid: str, password: str) -> tuple[bool, str]:
    """
    Configure WiFi using NetworkManager (for Raspberry Pi OS Bookworm+)
    
    Args:
        ssid: WiFi network SSID
        password: WiFi network password
        
    Returns:
        Tuple of (success: bool, ip_address: str)
    """
    print(f"Configuring WiFi using NetworkManager for SSID: {ssid}")
    
    try:
        # Remove existing connection with same SSID if it exists
        try:
            subprocess.run(
                ['sudo', 'nmcli', 'connection', 'delete', ssid],
                capture_output=True,
                timeout=5
            )
        except:
            pass  # Connection might not exist
        
        # Create new WiFi connection using NetworkManager
        print("Creating WiFi connection with NetworkManager...")
        result = subprocess.run(
            ['sudo', 'nmcli', 'device', 'wifi', 'connect', ssid, 'password', password],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print(f"✓ WiFi connection created successfully")
            print(f"nmcli output: {result.stdout}")
            return (True, "")
        else:
            print(f"ERROR: nmcli connect failed: {result.stderr}")
            # Try alternative method - create connection profile first
            print("Trying alternative method: creating connection profile...")
            try:
                # Create connection
                create_result = subprocess.run(
                    ['sudo', 'nmcli', 'connection', 'add', 
                     'type', 'wifi', 
                     'con-name', ssid,
                     'ifname', 'wlan0',
                     'ssid', ssid,
                     'wifi-sec.key-mgmt', 'wpa-psk',
                     'wifi-sec.psk', password],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if create_result.returncode == 0:
                    print("✓ Connection profile created")
                    # Activate the connection
                    activate_result = subprocess.run(
                        ['sudo', 'nmcli', 'connection', 'up', ssid],
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    if activate_result.returncode == 0:
                        print("✓ Connection activated")
                        return (True, "")
                    else:
                        print(f"ERROR: Failed to activate connection: {activate_result.stderr}")
                        return (False, "")
                else:
                    print(f"ERROR: Failed to create connection profile: {create_result.stderr}")
                    return (False, "")
            except Exception as e:
                print(f"ERROR: Exception in alternative method: {e}")
                return (False, "")
    except Exception as e:
        print(f"ERROR: NetworkManager configuration failed: {e}")
        return (False, "")


def configure_wifi(ssid: str, password: str) -> tuple[bool, str]:
    """
    Complete WiFi configuration process
    Detects if NetworkManager is active and uses appropriate method
    
    Args:
        ssid: WiFi network SSID
        password: WiFi network password
        
    Returns:
        Tuple of (success: bool, ip_address: str)
    """
    print(f"Starting WiFi configuration for SSID: {ssid}")
    
    # Check if NetworkManager is active
    networkmanager_active = False
    try:
        nm_check = subprocess.run(
            ['systemctl', 'is-active', '--quiet', 'NetworkManager'],
            timeout=2
        )
        if nm_check.returncode == 0:
            networkmanager_active = True
            print("NetworkManager is active - will use NetworkManager for WiFi configuration")
    except:
        pass
    
    # Step 0: Ensure WiFi is enabled
    print("Step 0: Checking WiFi interface status...")
    if not ensure_wifi_enabled():
        print("ERROR: WiFi interface is not enabled or cannot be enabled")
        return (False, "")
    print("WiFi interface is enabled and ready")
    
    # If NetworkManager is active, use it for configuration
    if networkmanager_active:
        print("Using NetworkManager for WiFi configuration...")
        # Write to wpa_supplicant.conf as backup, but use NetworkManager primarily
        write_wifi_config(ssid, password)  # Write as backup
        
        nm_success, _ = configure_wifi_with_networkmanager(ssid, password)
        if not nm_success:
            print("NetworkManager configuration failed, falling back to wpa_supplicant method...")
            # Fall through to wpa_supplicant method
        else:
            # NetworkManager configured successfully, now wait for IP
            print("Waiting 10 seconds for NetworkManager to connect...")
            time.sleep(10)
            ip_address = get_ip_address(timeout=60)
            if ip_address:
                print(f"WiFi configuration SUCCESSFUL! IP address: {ip_address}")
                return (True, ip_address)
            else:
                print("NetworkManager connected but IP address not obtained")
                return (False, "")
    
    # Write configuration to wpa_supplicant.conf (for non-NetworkManager or fallback)
    print("Step 1: Writing WiFi configuration to wpa_supplicant.conf...")
    if not write_wifi_config(ssid, password):
        print("ERROR: Failed to write WiFi configuration")
        return (False, "")
    print("WiFi configuration written successfully")
    
    # Restart WiFi
    print("Step 2: Restarting WiFi services...")
    if not restart_wifi():
        print("ERROR: Failed to restart WiFi services")
        return (False, "")
    print("WiFi services restarted successfully")
    
    # After restarting services, ensure interface is still UP
    print("Verifying WiFi interface is still UP after service restart...")
    if not ensure_wifi_enabled():
        print("WARNING: WiFi interface went DOWN after service restart, attempting to fix...")
        # Try one more time
        time.sleep(2)
        if not ensure_wifi_enabled():
            print("ERROR: Could not keep WiFi interface UP")
            return (False, "")
    
    # Give WiFi some time to start connecting before checking for IP
    print("Waiting 5 seconds for WiFi to start connecting...")
    time.sleep(5)
    
    # Check if wpa_supplicant is actually running
    print("Checking if wpa_supplicant is running...")
    try:
        wpa_status = subprocess.run(
            ['systemctl', 'is-active', 'wpa_supplicant'],
            capture_output=True,
            text=True,
            timeout=3
        )
        if wpa_status.returncode == 0:
            print("✓ wpa_supplicant service is active")
        else:
            print("⚠ wpa_supplicant service is not active")
            print("Attempting to start wpa_supplicant...")
            try:
                subprocess.run(['sudo', 'systemctl', 'start', 'wpa_supplicant'], 
                             check=True, timeout=10)
                print("✓ wpa_supplicant started")
                time.sleep(3)  # Give it time to initialize
            except Exception as e:
                print(f"Failed to start wpa_supplicant: {e}")
    except Exception as e:
        print(f"Could not check wpa_supplicant status: {e}")
    
    # Check WiFi connection status
    print("Checking WiFi connection status...")
    wifi_connected = False
    try:
        status_result = subprocess.run(
            ['sudo', 'wpa_cli', '-i', 'wlan0', 'status'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if status_result.returncode == 0:
            status_output = status_result.stdout.strip()
            print(f"WiFi status output:\n{status_output}")
            # Check if connected
            if 'wpa_state=COMPLETED' in status_output or 'wpa_state=4' in status_output:
                print("✓ WiFi is connected (COMPLETED state)")
                wifi_connected = True
            else:
                print(f"⚠ WiFi not in COMPLETED state. Current state: {status_output}")
        else:
            print(f"wpa_cli status returned non-zero: {status_result.returncode}")
            print(f"stderr: {status_result.stderr}")
            print("This might mean wpa_supplicant is not running or not configured for wlan0")
            # Try to check if NetworkManager is managing WiFi instead
            try:
                nm_result = subprocess.run(
                    ['nmcli', 'device', 'status'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if nm_result.returncode == 0:
                    print(f"NetworkManager device status:\n{nm_result.stdout}")
            except:
                pass
    except Exception as e:
        print(f"Could not check WiFi status with wpa_cli: {e}")
    
    # Also check interface status with ip command
    try:
        link_result = subprocess.run(
            ['ip', 'link', 'show', 'wlan0'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if link_result.returncode == 0:
            print(f"Interface wlan0 status:\n{link_result.stdout}")
            if 'state UP' in link_result.stdout:
                print("✓ Interface wlan0 is UP")
            else:
                print("⚠ Interface wlan0 is not UP")
    except Exception as e:
        print(f"Could not check interface status: {e}")
    
    # Check if we can see the SSID in scan
    if not wifi_connected:
        print("WiFi not connected yet, checking available networks...")
        try:
            scan_result = subprocess.run(
                ['sudo', 'wpa_cli', '-i', 'wlan0', 'scan'],
                capture_output=True,
                text=True,
                timeout=5
            )
            time.sleep(2)  # Wait for scan to complete
            list_result = subprocess.run(
                ['sudo', 'wpa_cli', '-i', 'wlan0', 'list_networks'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if list_result.returncode == 0:
                print(f"Configured networks:\n{list_result.stdout}")
        except Exception as e:
            print(f"Could not check networks: {e}")
    
    # Wait for IP address (increased timeout to 60 seconds)
    print("Step 3: Waiting for IP address assignment...")
    
    # Periodically check WiFi status while waiting for IP
    def check_wifi_periodically():
        """Check WiFi status every 10 seconds"""
        for i in range(6):  # Check 6 times over 60 seconds
            time.sleep(10)
            try:
                status_result = subprocess.run(
                    ['sudo', 'wpa_cli', '-i', 'wlan0', 'status'],
                    capture_output=True,
                    text=True,
                    timeout=3
                )
                if status_result.returncode == 0:
                    status_output = status_result.stdout.strip()
                    if 'wpa_state=COMPLETED' in status_output:
                        # Extract SSID and signal strength if available
                        ssid_line = [line for line in status_output.split('\n') if 'ssid=' in line]
                        if ssid_line:
                            print(f"WiFi status check: Connected to {ssid_line[0]}")
                        else:
                            print("WiFi status check: Connected (COMPLETED)")
                    else:
                        print(f"WiFi status check: Not connected - {status_output.split(chr(10))[0] if status_output else 'unknown'}")
            except:
                pass
    
    # Start background status checking
    import threading
    status_thread = threading.Thread(target=check_wifi_periodically, daemon=True)
    status_thread.start()
    
    ip_address = get_ip_address(timeout=60)
    
    if ip_address:
        print(f"WiFi configuration SUCCESSFUL! IP address: {ip_address}")
        return (True, ip_address)
    else:
        print("ERROR: WiFi configuration completed but IP address not obtained")
        
        # Final diagnostic check
        print("\n=== Final Diagnostic Check ===")
        try:
            # Check wpa_cli status one more time
            final_status = subprocess.run(
                ['sudo', 'wpa_cli', '-i', 'wlan0', 'status'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if final_status.returncode == 0:
                print(f"Final WiFi status:\n{final_status.stdout}")
            
            # Check if interface has any IP (even link-local)
            ip_result = subprocess.run(
                ['ip', 'addr', 'show', 'wlan0'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if ip_result.returncode == 0:
                print(f"Interface wlan0 details:\n{ip_result.stdout}")
            
            # Check NetworkManager status if it's running
            try:
                nm_status = subprocess.run(
                    ['systemctl', 'status', 'NetworkManager', '--no-pager', '-l'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if nm_status.returncode == 0:
                    print(f"NetworkManager status (last 10 lines):\n" + '\n'.join(nm_status.stdout.split('\n')[-10:]))
            except:
                pass
                
        except Exception as e:
            print(f"Error during final diagnostic: {e}")
        
        print("\nPossible causes:")
        print("  - WiFi credentials are incorrect")
        print("  - WiFi network is not in range")
        print("  - Network requires additional configuration (WPA2 Enterprise, etc.)")
        print("  - DHCP server is not responding")
        print("  - NetworkManager may be interfering with wpa_supplicant")
        return (False, "")


if __name__ == "__main__":
    """
    Command-line interface for WiFi configuration utilities
    Usage:
        python wifi_config.py delete-all    # Delete all saved WiFi networks
    """
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "delete-all":
        print("=" * 60)
        print("Deleting all saved WiFi networks from Raspberry Pi")
        print("=" * 60)
        result = delete_all_wifi_networks()
        if result:
            print("\n✓ All WiFi networks have been deleted successfully")
            sys.exit(0)
        else:
            print("\n⚠ Some operations may have failed")
            sys.exit(1)
    else:
        print("Usage: python wifi_config.py delete-all")
        print("\nThis will delete all saved WiFi networks from:")
        print("  - /etc/wpa_supplicant/wpa_supplicant.conf")
        print("  - NetworkManager connections (if active)")
        print("  - wpa_cli networks (if running)")
        sys.exit(1)

