#!/bin/bash

# Railway Setup Script for Security Analyst Platform
# Run this after: railway login

set -e

echo "🚂 Setting up Railway for Security Analyst Platform..."

# Create new project
echo "Creating Railway project..."
railway init

# Add PostgreSQL database
echo "Adding PostgreSQL database..."
railway add --database postgres

# Link GitHub repo for auto-deploy
echo "Linking GitHub repo..."
railway link --git

# Set environment variables
echo "Setting environment variables..."
railway variables --set "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
railway variables --set "NODE_ENV=production"

echo ""
echo "⚠️  Manual steps required:"
echo "1. Set ANTHROPIC_API_KEY in Railway dashboard"
echo "2. Get DATABASE_URL from Railway and update NEXTAUTH_URL"
echo ""
echo "After setting variables, run:"
echo "  railway up"
echo ""
echo "Then push schema and seed data:"
echo "  railway run npm run db:push"
echo "  railway run npm run db:seed"
echo ""
echo "✅ Setup complete!"
