#!/bin/bash

echo "🔍 Scanning TypeScript model files for 'extends Document'..."

# Sadece .ts uzantılı ve 'extends Document' içeren dosyaları hedef al
grep -rl --include="*.ts" "extends Document" ./src/modules | while read -r file; do
  echo "🧹 Updating $file"
  sed -i 's/extends Document//g' "$file"
done

echo "✅ All 'extends Document' removed from model files."


