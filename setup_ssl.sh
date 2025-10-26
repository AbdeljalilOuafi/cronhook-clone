#!/bin/bash
# CronHooks SSL Certificate Setup Script
# This script generates SSL certificates using Certbot with the --nginx flag

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== CronHooks SSL Certificate Setup ===${NC}\n"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Certbot not found. Installing...${NC}"
    apt update
    apt install certbot python3-certbot-nginx -y
    echo -e "${GREEN}Certbot installed successfully!${NC}\n"
fi

# Prompt for domain names
echo -e "${YELLOW}Enter your frontend domain (e.g., cronhooks.example.com):${NC}"
read FRONTEND_DOMAIN

echo -e "${YELLOW}Enter your backend API domain (e.g., api.cronhooks.example.com):${NC}"
read BACKEND_DOMAIN

echo -e "${YELLOW}Enter your email address for SSL notifications:${NC}"
read EMAIL

# Confirm
echo -e "\n${YELLOW}=== Configuration ===${NC}"
echo "Frontend domain: $FRONTEND_DOMAIN"
echo "Backend domain: $BACKEND_DOMAIN"
echo "Email: $EMAIL"
echo ""
read -p "Is this correct? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
fi

# Test nginx configuration first
echo -e "\n${YELLOW}Testing nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}Nginx configuration is valid!${NC}\n"
else
    echo -e "${RED}Nginx configuration has errors. Please fix them first.${NC}"
    exit 1
fi

# Generate SSL certificates
echo -e "${YELLOW}Generating SSL certificates...${NC}\n"

certbot --nginx \
    -d "$FRONTEND_DOMAIN" \
    -d "$BACKEND_DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --redirect

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}=== Success! ===${NC}"
    echo -e "${GREEN}SSL certificates have been generated and nginx has been configured.${NC}"
    echo -e "${GREEN}Your sites are now accessible via HTTPS:${NC}"
    echo -e "  - Frontend: ${GREEN}https://$FRONTEND_DOMAIN${NC}"
    echo -e "  - Backend:  ${GREEN}https://$BACKEND_DOMAIN${NC}"
    echo ""
    echo -e "${YELLOW}Auto-renewal is configured. Certificates will renew automatically.${NC}"
    echo -e "Test auto-renewal with: ${GREEN}sudo certbot renew --dry-run${NC}"
else
    echo -e "\n${RED}Certificate generation failed!${NC}"
    echo -e "${YELLOW}Common issues:${NC}"
    echo "  - Domain DNS not pointing to this server"
    echo "  - Port 80/443 not accessible"
    echo "  - Firewall blocking traffic"
    exit 1
fi
