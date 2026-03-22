#!/bin/bash

# Retro Game Launcher Setup Script for macOS/Linux

echo ""
echo "================================="
echo "  Retro Game Launcher - Setup"
echo "================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please download and install Node.js from https://nodejs.org/"
    exit 1
fi

echo "[OK] Node.js detected"
node --version

echo ""
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies!"
    exit 1
fi

echo "[OK] Dependencies installed"

echo ""
echo "Setup complete!"
echo "To start the application, run: npm start"
echo ""
