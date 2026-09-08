#!/bin/bash

# TrackBuddy Deployment Script for Ubuntu
echo "🚀 Starting TrackBuddy Deployment on kavan.in..."

# 1. Update system and install Docker if not present
if ! [ -x "$(command -v docker)" ]; then
  echo "📦 Installing Docker..."
  sudo apt-get update
  sudo apt-get install -y docker.io docker-compose
fi

# 2. Build and restart containers
echo "🏗️ Building Docker images..."
docker-compose down
docker-compose up --build -d

echo "✅ Deployment complete! App should be running at http://kavan.in"
echo "Note: Mapping port 3000 to http://kavan.in"
echo "To see logs: docker-compose logs -f"
