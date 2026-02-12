#!/bin/bash
# Initial setup script for Contoso Civil App

echo "🚀 Contoso Civil App - Setup Script"
echo "===================================="
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."
command -v node &> /dev/null || { echo "❌ Node.js not found. Please install Node.js 18+"; exit 1; }
command -v npm &> /dev/null || { echo "❌ npm not found"; exit 1; }

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"
echo ""

# Setup environment file
echo "✓ Setting up environment file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env file"
    echo "⚠️  Please update .env with your configuration"
else
    echo "✓ .env file already exists"
fi
echo ""

# Install dependencies
echo "✓ Installing dependencies..."
npm install --workspaces
echo "✓ Dependencies installed"
echo ""

# Start with Docker
read -p "Do you want to start services with Docker? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "✓ Starting services with Docker Compose..."
    npm run docker:up
    echo ""
    echo "✅ Services are running!"
    echo ""
    echo "Access points:"
    echo "  - Frontend: http://localhost:3100"
    echo "  - API Gateway: http://localhost:3000/api"
    echo "  - Database: localhost:1433"
else
    echo "✓ Skipped Docker startup"
    echo ""
    echo "To start services manually, run:"
    echo "  npm run docker:up"
fi

echo ""
echo "✅ Setup complete!"
