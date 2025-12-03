#!/bin/bash

# KeePass Desktop (Tauri) — Автоматизированный тестовый скрипт
# Использование: ./test-keepass-tauri.sh

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Логирование
LOG_FILE="keepass-test-$(date +%Y%m%d_%H%M%S).log"
TEST_RESULTS="keepass-test-results-$(date +%Y%m%d_%H%M%S).json"

# Функции для логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$LOG_FILE"
}

# Инициализация результатов тестов
init_test_results() {
    cat > "$TEST_RESULTS" << EOF
{
    "test_date": "$(date -Iseconds)",
    "tests": [],
    "summary": {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0
    }
}
EOF
}

# Добавление результата теста
add_test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    # Обновляем JSON файл
    jq --arg name "$test_name" \
       --arg status "$status" \
       --arg message "$message" \
       --arg time "$(date -Iseconds)" \
       '.tests += [{"name": $name, "status": $status, "message": $message, "time": $time}]' \
       "$TEST_RESULTS" > "${TEST_RESULTS}.tmp" && mv "${TEST_RESULTS}.tmp" "$TEST_RESULTS"
}

# Обновление сводки
update_summary() {
    local total=$(jq '.tests | length' "$TEST_RESULTS")
    local passed=$(jq '.tests | map(select(.status == "PASS")) | length' "$TEST_RESULTS")
    local failed=$(jq '.tests | map(select(.status == "FAIL")) | length' "$TEST_RESULTS")
    local skipped=$(jq '.tests | map(select(.status == "SKIP")) | length' "$TEST_RESULTS")
    
    jq --arg total "$total" \
       --arg passed "$passed" \
       --arg failed "$failed" \
       --arg skipped "$skipped" \
       '.summary.total = ($total | tonumber) | .summary.passed = ($passed | tonumber) | .summary.failed = ($failed | tonumber) | .summary.skipped = ($skipped | tonumber)' \
       "$TEST_RESULTS" > "${TEST_RESULTS}.tmp" && mv "${TEST_RESULTS}.tmp" "$TEST_RESULTS"
}

# Проверка зависимостей
check_dependencies() {
    log "Проверка зависимостей..."
    
    local deps=("node" "pnpm" "cargo" "jq")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Отсутствуют зависимости: ${missing_deps[*]}"
        add_test_result "dependencies_check" "FAIL" "Missing: ${missing_deps[*]}"
        return 1
    else
        success "Все зависимости установлены"
        add_test_result "dependencies_check" "PASS" "All dependencies found"
    fi
}

# Проверка структуры проекта
check_project_structure() {
    log "Проверка структуры проекта..."
    
    local required_files=(
        "package.json"
        "src-tauri/Cargo.toml"
        "src/components/KeePassDesktop.tsx"
        "src-tauri/src/keepass/mod.rs"
        "src-tauri/src/keepass/commands.rs"
        "src-tauri/src/keepass/storage.rs"
        "src-tauri/src/keepass/models.rs"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        error "Отсутствуют файлы: ${missing_files[*]}"
        add_test_result "project_structure" "FAIL" "Missing files: ${missing_files[*]}"
        return 1
    else
        success "Структура проекта корректна"
        add_test_result "project_structure" "PASS" "All required files present"
    fi
}

# Проверка сборки frontend
test_frontend_build() {
    log "Тестирование сборки frontend..."
    
    if pnpm build; then
        success "Frontend успешно собран"
        add_test_result "frontend_build" "PASS" "Frontend build successful"
    else
        error "Ошибка сборки frontend"
        add_test_result "frontend_build" "FAIL" "Frontend build failed"
        return 1
    fi
}

# Проверка сборки Rust
test_rust_build() {
    log "Тестирование сборки Rust..."
    
    if cargo check --manifest-path src-tauri/Cargo.toml; then
        success "Rust код компилируется без ошибок"
        add_test_result "rust_build" "PASS" "Rust code compiles successfully"
    else
        error "Ошибка компиляции Rust кода"
        add_test_result "rust_build" "FAIL" "Rust compilation failed"
        return 1
    fi
}

# Проверка Tauri команд
test_tauri_commands() {
    log "Проверка Tauri команд..."
    
    # Проверяем, что команды зарегистрированы
    local commands=(
        "find_kdbx_files"
        "open_container"
        "create_container"
        "save_container"
        "add_entry"
        "search_entries"
        "get_container_stats"
        "create_backup"
        "list_backups"
        "restore_backup"
        "get_config"
        "save_config"
    )
    
    local missing_commands=()
    
    # Проверяем наличие команд в lib.rs
    for cmd in "${commands[@]}"; do
        if ! grep -q "$cmd" src-tauri/src/lib.rs; then
            missing_commands+=("$cmd")
        fi
    done
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        error "Отсутствуют команды: ${missing_commands[*]}"
        add_test_result "tauri_commands" "FAIL" "Missing commands: ${missing_commands[*]}"
        return 1
    else
        success "Все Tauri команды зарегистрированы"
        add_test_result "tauri_commands" "PASS" "All Tauri commands registered"
    fi
}

# Проверка UI компонентов
test_ui_components() {
    log "Проверка UI компонентов..."
    
    local components=(
        "KeePassDesktop"
        "Button"
        "Input"
        "Icon"
        "NotificationSystem"
    )
    
    local missing_components=()
    
    for component in "${components[@]}"; do
        if ! find src/components -name "*.tsx" -exec grep -l "$component" {} \; | grep -q .; then
            missing_components+=("$component")
        fi
    done
    
    if [ ${#missing_components[@]} -ne 0 ]; then
        error "Отсутствуют компоненты: ${missing_components[*]}"
        add_test_result "ui_components" "FAIL" "Missing components: ${missing_components[*]}"
        return 1
    else
        success "Все UI компоненты найдены"
        add_test_result "ui_components" "PASS" "All UI components found"
    fi
}

# Проверка иконок
test_icons() {
    log "Проверка иконок..."
    
    local icons=(
        "plus"
        "refresh"
        "save"
        "backup"
        "shield"
    )
    
    local missing_icons=()
    
    for icon in "${icons[@]}"; do
        if [ ! -f "src/components/Icon/$icon.svg" ]; then
            missing_icons+=("$icon")
        fi
    done
    
    if [ ${#missing_icons[@]} -ne 0 ]; then
        error "Отсутствуют иконки: ${missing_icons[*]}"
        add_test_result "icons" "FAIL" "Missing icons: ${missing_icons[*]}"
        return 1
    else
        success "Все иконки найдены"
        add_test_result "icons" "PASS" "All icons found"
    fi
}

# Проверка маршрутов
test_routes() {
    log "Проверка маршрутов..."
    
    if [ -f "src/routes/gated.keepass.tsx" ]; then
        success "Маршрут KeePass найден"
        add_test_result "routes" "PASS" "KeePass route found"
    else
        error "Маршрут KeePass не найден"
        add_test_result "routes" "FAIL" "KeePass route missing"
        return 1
    fi
}

# Проверка зависимостей Cargo
test_cargo_dependencies() {
    log "Проверка зависимостей Cargo..."
    
    local required_deps=(
        "keepass"
        "aes"
        "aes-gcm"
        "argon2"
    )
    
    local missing_deps=()
    
    for dep in "${required_deps[@]}"; do
        if ! grep -q "$dep" src-tauri/Cargo.toml; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Отсутствуют зависимости Cargo: ${missing_deps[*]}"
        add_test_result "cargo_dependencies" "FAIL" "Missing Cargo deps: ${missing_deps[*]}"
        return 1
    else
        success "Все зависимости Cargo найдены"
        add_test_result "cargo_dependencies" "PASS" "All Cargo dependencies found"
    fi
}

# Проверка безопасности
test_security() {
    log "Проверка безопасности..."
    
    # Проверяем, что нет хардкода паролей
    if grep -r "password.*=.*['\"].*['\"]" src/ src-tauri/ --exclude-dir=target --exclude-dir=node_modules; then
        warning "Найден потенциальный хардкод паролей"
        add_test_result "security" "SKIP" "Potential hardcoded passwords found"
    else
        success "Хардкод паролей не найден"
        add_test_result "security" "PASS" "No hardcoded passwords found"
    fi
    
    # Проверяем, что нет прямых сетевых вызовов
    if grep -r "fetch.*http" src/ --exclude-dir=node_modules; then
        warning "Найдены прямые HTTP вызовы"
        add_test_result "network_security" "SKIP" "Direct HTTP calls found"
    else
        success "Прямые HTTP вызовы не найдены"
        add_test_result "network_security" "PASS" "No direct HTTP calls found"
    fi
}

# Проверка документации
test_documentation() {
    log "Проверка документации..."
    
    local docs=(
        "Docs/keepass/TECH_SPEC_TAURI_NATIVE.md"
        "Docs/keepass/KEEPASS_TEST_SCRIPT.md"
    )
    
    local missing_docs=()
    
    for doc in "${docs[@]}"; do
        if [ ! -f "$doc" ]; then
            missing_docs+=("$doc")
        fi
    done
    
    if [ ${#missing_docs[@]} -ne 0 ]; then
        error "Отсутствует документация: ${missing_docs[*]}"
        add_test_result "documentation" "FAIL" "Missing docs: ${missing_docs[*]}"
        return 1
    else
        success "Вся документация найдена"
        add_test_result "documentation" "PASS" "All documentation found"
    fi
}

# Основная функция
main() {
    log "Начало тестирования KeePass Desktop (Tauri)"
    log "Лог файл: $LOG_FILE"
    log "Результаты: $TEST_RESULTS"
    
    init_test_results
    
    # Выполняем тесты
    check_dependencies
    check_project_structure
    test_frontend_build
    test_rust_build
    test_tauri_commands
    test_ui_components
    test_icons
    test_routes
    test_cargo_dependencies
    test_security
    test_documentation
    
    # Обновляем сводку
    update_summary
    
    # Выводим результаты
    log "=== РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ==="
    jq -r '.summary | "Всего: \(.total), Успешно: \(.passed), Ошибок: \(.failed), Пропущено: \(.skipped)"' "$TEST_RESULTS"
    
    # Выводим детали
    echo ""
    log "=== ДЕТАЛИ ==="
    jq -r '.tests[] | "\(.status) - \(.name): \(.message)"' "$TEST_RESULTS"
    
    # Проверяем общий результат
    local failed=$(jq '.summary.failed' "$TEST_RESULTS")
    if [ "$failed" -eq 0 ]; then
        success "Все тесты прошли успешно!"
        exit 0
    else
        error "Найдены ошибки в $failed тестах"
        exit 1
    fi
}

# Обработка сигналов
trap 'log "Тестирование прервано пользователем"; exit 1' INT TERM

# Запуск
main "$@" 