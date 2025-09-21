# Raspberry Pi Setup

## 🚨 Řešení EMFILE error (too many open files)

### Krok 1: Spusťte script pro opravu limitů
```bash
chmod +x fix-rpi-limits.sh
./fix-rpi-limits.sh
```

### Krok 2: Spusťte build
```bash
podman-compose up --build
```

## 🔧 Manuální oprava limitů

### Dočasné řešení (pro aktuální session):
```bash
ulimit -n 65536
ulimit -Hn 65536
```

### Trvalé řešení:
```bash
echo "ulimit -n 65536" >> ~/.bashrc
source ~/.bashrc
```

## 📋 Použití

### Možnost 1: Cross-compilation build (DOPORUČENO)
```bash
# Na výkonnějším systému (x86_64):
chmod +x build-arm.sh
./build-arm.sh

# Přeneste tar soubory na Raspberry Pi a načtěte:
podman load -i scratch-gui-arm64.tar
podman load -i scratch-backend-arm64.tar
podman-compose up -d
```

### Možnost 2: Přímý build na Raspberry Pi
```bash
# Spuštění na Raspberry Pi
podman-compose up --build

# Nebo s detach mode
podman-compose up --build -d
```

## 🔍 Troubleshooting

### Pokud stále dostáváte EMFILE error:
1. Zkontrolujte limity: `ulimit -n`
2. Restartujte systém
3. Zkuste build bez cache: `podman-compose build --no-cache`

### Pokud build trvá příliš dlouho:
- Raspberry Pi 3 má omezený výkon
- Build může trvat 30-60 minut
- Doporučujeme build na výkonnějším systému a push do registry
