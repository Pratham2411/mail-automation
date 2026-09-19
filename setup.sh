#!/bin/bash
echo ""
echo "============================================"
echo "  RecruiterReach - One-Click Setup"
echo "============================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo ""
    echo "Install it from: https://nodejs.org/"
    echo "Or use: brew install node (macOS) / sudo apt install nodejs npm (Ubuntu)"
    echo ""
    exit 1
fi

NODE_VER=$(node -v)
echo "[OK] Node.js $NODE_VER detected"
echo ""

# Navigate to app directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/app"

# Create data directory
mkdir -p data
echo "[OK] Data directory ready"

# Install dependencies
echo ""
echo "Installing dependencies..."
echo ""
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] npm install failed."
    exit 1
fi
echo ""
echo "[OK] Dependencies installed"

# Seed database
echo ""
echo "Setting up database..."
node -e "const{seedDatabase}=require('./src/lib/seed');seedDatabase();" 2>/dev/null || true
echo "[OK] Database ready"

# Start
echo ""
echo "============================================"
echo "  Starting RecruiterReach..."
echo "  Open http://localhost:3000 in your browser"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop."
echo ""

# Open browser (works on macOS and Linux)
if command -v open &> /dev/null; then
    open http://localhost:3000 &
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 &
fi

npm run dev
