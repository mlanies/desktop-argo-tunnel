.PHONY: help install dev backend frontend clean

# Default target
help:
	@echo "Available commands:"
	@echo "  install    - Install all dependencies (npm + go)"
	@echo "  backend    - Run Go backend only"
	@echo "  frontend   - Run Tauri frontend only"
	@echo "  dev        - Run both backend and frontend"
	@echo "  clean      - Clean build artifacts"

# Install all dependencies
install:
	@echo "Installing npm dependencies..."
	npm install
	@echo "Installing Go dependencies..."
	cd backend && go mod tidy
	@echo "Installation complete!"

# Run Go backend
backend:
	@echo "Starting Go backend..."
	cd backend && go run main.go

# Run Tauri frontend
frontend:
	@echo "Starting Tauri frontend..."
	npm run tauri dev

# Run both backend and frontend
dev:
	@echo "Starting KeePass Desktop (backend + frontend)..."
	concurrently "make backend" "make frontend"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist
	rm -rf src-tauri/target
	@echo "Clean complete!" 