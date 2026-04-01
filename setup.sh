#!/bin/bash
# JournalAI — Setup Script
# Run this to install all dependencies and start the dev server
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh

echo "=============================="
echo "  JournalAI Setup"
echo "=============================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
echo "Node.js version: $(node -v)"
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "WARNING: Node.js 18+ is recommended. You have $(node -v)"
fi

# Check npm
echo "npm version: $(npm -v)"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
echo ""

# Check .env.local
if [ ! -f .env.local ]; then
    echo "Creating .env.local..."
    cat > .env.local << 'EOF'
# JournalAI — Environment Configuration
# Add your Anthropic API key to enable AI-powered extraction
# Without it, the app falls back to heuristic pattern matching
ANTHROPIC_API_KEY=
EOF
    echo "NOTE: Add your Anthropic API key to .env.local for AI extraction"
else
    echo ".env.local already exists"
fi

echo ""
echo "=============================="
echo "  Setup complete!"
echo "=============================="
echo ""
echo "To start the dev server:"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000"
echo "Login: demo@journalai.sg / demo123"
echo ""
