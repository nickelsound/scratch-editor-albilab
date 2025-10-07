# AlbiLAB Extension - Backend Implementation

## Přehled

AlbiLAB Extension nyní podporuje skutečnou komunikaci s AlbiLAB zařízením přes HTTP API. Extension automaticky komunikuje s fyzickým zařízením a poskytuje fallback do simulovaného režimu, pokud zařízení není dostupné.

## Konfigurace

### Výchozí nastavení
- **IP adresa**: `10.0.0.108`
- **Timeout**: 5 sekund
- **Retry**: 3 pokusy s 1 sekundovým zpožděním
- **Cache**: 2 sekundy pro senzorová data

### Změna IP adresy
Použijte blok "nastavit IP adresu AlbiLAB na [IP]" pro změnu IP adresy zařízení.

## API Endpointy

### Informace o zařízení
- **GET** `/info` - Získání všech informací o zařízení a senzorech

### Ovládání čerpadla
- **GET** `/pump?action=start` - Spustí pumpu na neurčito
- **GET** `/pump?action=stop` - Zastaví pumpu
- **GET** `/pump?action=timed&duration=30` - Spustí pumpu na 30 sekund (max 300s)

### Ovládání větráku
- **GET** `/fan?action=start` - Spustí větrák na neurčito
- **GET** `/fan?action=stop` - Zastaví větrák
- **GET** `/fan?action=timed&duration=60` - Spustí větrák na 60 sekund (max 300s)

### Ovládání světel
- **GET** `/lights?action=on` - Zapne světla
- **GET** `/lights?action=off` - Vypne světla
- **GET** `/lights?action=custom&red=50&blue=30&white=80` - Nastaví vlastní intenzitu

## Struktura dat ze senzorů

### /info Response
```json
{
    "sensors": {
        "soilMoisture": {
            "values": {
                "moisture": 93,
                "moistureUnits": "%"
            }
        },
        "thermoHumid": {
            "values": {
                "temperature": 22.5,
                "humidity": 65.0
            }
        },
        "waterSwitch": {
            "values": {
                "waterPresent": true
            }
        }
    }
}
```

## Error Handling

Extension implementuje robustní error handling:

1. **Timeout**: Pokud zařízení neodpoví do 5 sekund
2. **Retry**: Automatické opakování při selhání
3. **Fallback**: Simulovaná data při nedostupnosti zařízení
4. **Logging**: Detailní logování chyb do konzole

## Bloky

### Ovládání zařízení
- `zapnout světla` - Zapne světla
- `vypnout světla` - Vypne světla
- `rozsvítit světla červená [X]% modrá [Y]% bílá [Z]%` - Nastaví vlastní intenzitu pro každou barvu (0-100%)
- `zapnout čerpadlo` - Spustí pumpu
- `vypnout čerpadlo` - Zastaví pumpu
- `zapnout čerpadlo na [sekundy] sekund` - Spustí pumpu na určitý čas
- `vypnout čerpadlo na [sekundy] sekund` - Vypne pumpu na určitý čas
- `zapnout větrák` - Spustí větrák
- `vypnout větrák` - Zastaví větrák
- `zapnout větrák na [sekundy] sekund` - Spustí větrák na určitý čas

### Senzory
- `teplota vzduchu` - Vrátí teplotu vzduchu (°C)
- `vlhkost vzduchu` - Vrátí vlhkost vzduchu (%)
- `vlhkost půdy` - Vrátí vlhkost půdy (%)
- `přítomnost vody v nádrži` - Vrátí true/false

### Konfigurace
- `nastavit IP adresu AlbiLAB na [IP]` - Nastaví IP adresu zařízení

## Příklady použití světel

### Základní barvy:
- **Bílá**: červená 0%, modrá 0%, bílá 100%
- **Červená**: červená 100%, modrá 0%, bílá 0%
- **Modrá**: červená 0%, modrá 100%, bílá 0%
- **Fialová**: červená 50%, modrá 50%, bílá 0%
- **Růžová**: červená 80%, modrá 20%, bílá 50%

### Kombinace:
- **Teplé bílé**: červená 20%, modrá 0%, bílá 80%
- **Studené bílé**: červená 0%, modrá 20%, bílá 80%
- **Plná intenzita**: červená 100%, modrá 100%, bílá 100%

## Použití

1. **Automatické načtení**: AlbiLAB extension se načte automaticky při startu každého nového projektu
2. **Základní použití**: Extension automaticky používá výchozí IP `10.0.0.108`
3. **Změna IP**: Použijte konfigurační blok pro změnu IP adresy
4. **Offline režim**: Pokud zařízení není dostupné, extension automaticky přepne do simulovaného režimu
5. **Debugging**: Sledujte konzoli prohlížeče pro detailní logy

## Technické detaily

### Soubory
- `config.js` - Konfigurace API
- `api-client.js` - HTTP klient pro komunikaci s AlbiLAB
- `index.js` - Hlavní extension s bloky
- `README.md` - Tato dokumentace

### Závislosti
- Fetch API pro HTTP požadavky
- AbortController pro timeout handling
- Map pro caching senzorových dat

### Kompatibilita
- Moderní prohlížeče s podporou Fetch API
- Scratch 3.0 GUI
- AlbiLAB firmware verze 1.0.182+
