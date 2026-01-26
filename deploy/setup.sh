#!/bin/bash
# First-time setup script for WeatherAggregator on EC2
# Run this once after SSHing into the EC2 instance

set -e

DEPLOY_DIR="/srv/weatheraggregator"

echo "=== WeatherAggregator Setup ==="

# Create deployment directory
sudo mkdir -p "$DEPLOY_DIR"
sudo chown $USER:$USER "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# Copy docker-compose file (assuming it's already there from CI or manual upload)
if [ ! -f docker-compose.prod.yml ]; then
    echo "Error: docker-compose.prod.yml not found in $DEPLOY_DIR"
    echo "Please upload it first or run the GitHub Actions deploy workflow."
    exit 1
fi

# Start the services
echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Services started. Don't forget to:"
echo "1. Add the Caddy configuration for your domain"
echo "2. Reload Caddy: docker exec caddy caddy reload --config /etc/caddy/Caddyfile"
echo ""
echo "Example Caddyfile entry:"
echo ""
echo "weather.gulatilabs.me {"
echo "  handle /api/* {"
echo "    reverse_proxy weatheraggregator-api:3002"
echo "  }"
echo "  handle {"
echo "    reverse_proxy weatheraggregator-web:80"
echo "  }"
echo "}"
