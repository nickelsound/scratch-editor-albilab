import importlib.util
import sys
import tempfile
import types
import unittest
from pathlib import Path


BLE_DIR = Path(__file__).resolve().parent


def _method_decorator(*_args, **_kwargs):
    def decorate(func):
        return func

    return decorate


def _install_ble_import_stubs():
    dbus = types.ModuleType('dbus')
    dbus.__path__ = []

    dbus_exceptions = types.ModuleType('dbus.exceptions')

    class DBusException(Exception):
        pass

    dbus_exceptions.DBusException = DBusException

    dbus_service = types.ModuleType('dbus.service')

    class DBusObject:
        def __init__(self, *_args, **_kwargs):
            pass

    dbus_service.Object = DBusObject
    dbus_service.method = _method_decorator
    dbus_service.signal = _method_decorator

    dbus_mainloop = types.ModuleType('dbus.mainloop')
    dbus_mainloop.__path__ = []
    dbus_glib = types.ModuleType('dbus.mainloop.glib')

    def dbus_g_main_loop(*_args, **_kwargs):
        return None

    dbus_glib.DBusGMainLoop = dbus_g_main_loop
    dbus_mainloop.glib = dbus_glib

    dbus.exceptions = dbus_exceptions
    dbus.service = dbus_service
    dbus.mainloop = dbus_mainloop
    dbus.Array = lambda value=None, **_kwargs: list(value or [])
    dbus.Byte = lambda value: value
    dbus.Signature = lambda value: value
    dbus.ObjectPath = lambda value: value
    dbus.Dictionary = lambda value=None, **_kwargs: dict(value or {})
    dbus.Boolean = bool

    gi = types.ModuleType('gi')
    gi.__path__ = []
    gi_repository = types.ModuleType('gi.repository')

    class MainLoop:
        def run(self):
            return None

        def quit(self):
            return None

    gi_repository.GLib = types.SimpleNamespace(MainLoop=MainLoop)

    sys.modules['dbus'] = dbus
    sys.modules['dbus.exceptions'] = dbus_exceptions
    sys.modules['dbus.service'] = dbus_service
    sys.modules['dbus.mainloop'] = dbus_mainloop
    sys.modules['dbus.mainloop.glib'] = dbus_glib
    sys.modules['gi'] = gi
    sys.modules['gi.repository'] = gi_repository


def _load_ble_wifi_server():
    _install_ble_import_stubs()
    sys.path.insert(0, str(BLE_DIR))
    spec = importlib.util.spec_from_file_location(
        'ble_wifi_server_under_test',
        BLE_DIR / 'ble_wifi_server.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class DotenvFileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ble_wifi_server = _load_ble_wifi_server()

    def test_update_dotenv_file_sets_install_owner_before_locking_file_down(self):
        module = self.ble_wifi_server

        with tempfile.TemporaryDirectory() as temp_dir:
            env_path = Path(temp_dir) / '.env'
            install_dir_stat = types.SimpleNamespace(st_uid=1000, st_gid=1000)
            root_owned_file_stat = types.SimpleNamespace(st_uid=0, st_gid=0)
            chown_calls = []
            chmod_calls = []

            missing_chown = object()
            original_chown = getattr(module.os, 'chown', missing_chown)
            original_chmod = module.os.chmod
            original_stat = module.os.stat

            def fake_stat(path, *args, **kwargs):
                original_stat(path, *args, **kwargs)
                if Path(path) == Path(temp_dir):
                    return install_dir_stat
                if Path(path) == env_path:
                    return root_owned_file_stat
                return original_stat(path, *args, **kwargs)

            def fake_chown(path, uid, gid):
                chown_calls.append((Path(path), uid, gid))

            def fake_chmod(path, mode):
                chmod_calls.append((Path(path), mode))

            module.os.stat = fake_stat
            module.os.chown = fake_chown
            module.os.chmod = fake_chmod
            try:
                module.update_dotenv_file(
                    str(env_path),
                    'DISABLE_BACKGROUND_PROJECTS',
                    'true')
            finally:
                if original_chown is missing_chown:
                    delattr(module.os, 'chown')
                else:
                    module.os.chown = original_chown
                module.os.chmod = original_chmod
                module.os.stat = original_stat

            self.assertEqual(env_path.read_text(encoding='utf-8'), 'DISABLE_BACKGROUND_PROJECTS=true\n')
            self.assertEqual(chown_calls, [(env_path, install_dir_stat.st_uid, install_dir_stat.st_gid)])
            self.assertEqual(chmod_calls, [(env_path, 0o600)])


if __name__ == '__main__':
    unittest.main()
