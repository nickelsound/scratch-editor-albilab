#!/bin/bash

# Jednoduchý script pro opravu EMFILE error na Raspberry Pi
echo "🔧 Opravuji limity otevřených souborů na Raspberry Pi..."

# Zvýšíme limity pro aktuální session
ulimit -n 65536
ulimit -Hn 65536

echo "📊 Aktuální limity:"
echo "Soft limit: $(ulimit -Sn)"
echo "Hard limit: $(ulimit -Hn)"

echo "✅ Limity byly zvýšeny pro aktuální session!"
echo "🔄 Pro trvalé nastavení přidejte do ~/.bashrc:"
echo "ulimit -n 65536"
echo ""
echo "🚀 Nyní můžete spustit: podman-compose up --build"
