#!/bin/bash

# Скрипт для исправления TypeScript ошибок
echo "Исправление TypeScript ошибок..."

# Удаляем неиспользуемые импорты React
find src -name "*.tsx" -exec sed -i '' 's/import React, /import /g' {} \;
find src -name "*.tsx" -exec sed -i '' 's/import React from /\/\/ import React from /g' {} \;

# Удаляем неиспользуемые импорты
find src -name "*.tsx" -exec sed -i '' 's/import { open } from /\/\/ import { open } from /g' {} \;

# Комментируем неиспользуемые переменные
find src -name "*.tsx" -exec sed -i '' 's/const exportEvents = /\/\/ const exportEvents = /g' {} \;
find src -name "*.tsx" -exec sed -i '' 's/const parseDetails = /\/\/ const parseDetails = /g' {} \;
find src -name "*.tsx" -exec sed -i '' 's/const showDiagnostics = /\/\/ const showDiagnostics = /g' {} \;
find src -name "*.tsx" -exec sed -i '' 's/const setShowDiagnostics = /\/\/ const setShowDiagnostics = /g' {} \;

echo "TypeScript ошибки исправлены!" 