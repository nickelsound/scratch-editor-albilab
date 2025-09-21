# Raspberry Pi Setup

## 🚀 Cross-compilation build (DOPORUČENO)

### Krok 1: Build na výkonnějším systému (x86_64)
```bash
# Na x86_64 počítači:
chmod +x build-arm.sh
./build-arm.sh
```

### Krok 2: Přeneste tar soubory na Raspberry Pi
```bash
# Přeneste soubory (např. přes scp):
scp scratch-gui-arm64.tar scratch-backend-arm64.tar user@rpi:/path/
```

### Krok 3: Načtěte images na Raspberry Pi
```bash
# Na Raspberry Pi:
podman load -i scratch-gui-arm64.tar
podman load -i scratch-backend-arm64.tar
podman-compose up -d
```

## 📋 Alternativní možnosti

### Možnost 1: Přímý build na Raspberry Pi
```bash
# Spuštění na Raspberry Pi (pomalejší)
podman-compose up --build -d
```

### Možnost 2: Build s docker-compose
```bash
# Pokud máte Docker místo Podman
docker-compose up --build -d
```

## 🔍 Troubleshooting

### Pokud build trvá příliš dlouho:
- Raspberry Pi 3 má omezený výkon
- Build může trvat 1-2 hodiny
- **Doporučujeme cross-compilation na x86_64**

### Pokud dostáváte EMFILE error:
- Použijte cross-compilation (řeší problém automaticky)
- Nebo zvyšte limity: `ulimit -n 65536`

### Pokud images nefungují:
- Zkontrolujte architekturu: `podman inspect image_name | grep -i arch`
- Mělo by být: `"Architecture": "arm64"`
