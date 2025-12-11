#!/bin/bash

# School Admissions Core - Quick Setup Script
set -e

# ASCII Art Banner
cat << "EOF"

╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     ███████╗ ██████╗██╗  ██╗ ██████╗ ██╗      █████╗        ║
║     ██╔════╝██╔════╝██║  ██║██╔═══██╗██║     ██╔══██╗       ║
║     ███████╗██║     ███████║██║   ██║██║     ███████║       ║
║     ╚════██║██║     ██╔══██║██║   ██║██║     ██╔══██║       ║
║     ███████║╚██████╗██║  ██║╚██████╔╝███████╗██║  ██║       ║
║     ╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝       ║
║                                                              ║
║          School Admissions Core - Setup Script              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

EOF

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
print_step() { echo -e "\n${BOLD}${BLUE}━━━ $1 ━━━${NC}\n"; }

# Check Node.js
print_step "Checking Prerequisites"
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) detected"
print_success "npm $(npm -v) detected"

# Setup Backend
print_step "Setting up Backend"
cd backend

if [ ! -d "node_modules" ]; then
    print_info "Installing backend dependencies..."
    npm install
else
    print_success "Backend dependencies already installed"
fi

# Setup .env
if [ ! -f ".env" ]; then
    print_info "Creating .env file..."
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-me-in-production-$(date +%s)")
    cat > .env << EOF
DATABASE_URL="file:./dev.db"
JWT_SECRET="${JWT_SECRET}"
PORT=3000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
AUTO_SEED="true"
EOF
    print_success "Created .env file with generated JWT_SECRET"
else
    print_success ".env file already exists"
fi

# Run migrations
print_info "Running database migrations..."
npx prisma migrate dev --name init 2>/dev/null || npx prisma migrate deploy

# Generate Prisma Client
print_info "Generating Prisma Client..."
npx prisma generate

# Seed database
print_info "Seeding database..."
npm run seed-permissions 2>/dev/null || print_warning "Permission seeding skipped"
npm run seed 2>/dev/null || print_warning "Database seeding skipped"

print_success "Backend setup complete!"

# Setup Frontend
print_step "Setting up Frontend"
cd ../frontend

if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    npm install
else
    print_success "Frontend dependencies already installed"
fi

# Setup .env
if [ ! -f ".env" ]; then
    print_info "Creating .env file..."
    cat > .env << EOF
VITE_API_URL=http://localhost:3000/api
EOF
    print_success "Created .env file"
else
    print_success ".env file already exists"
fi

print_success "Frontend setup complete!"

# Return to root
cd ..

# Final message
echo ""
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                    ✅ Setup Complete!                       ║
╚══════════════════════════════════════════════════════════════╝
EOF

echo ""
echo -e "${BOLD}📋 Next steps:${NC}"
echo ""
echo "1. Start Backend (Terminal 1):"
echo -e "   ${CYAN}cd backend && npm run dev${NC}"
echo ""
echo "2. Start Frontend (Terminal 2):"
echo -e "   ${CYAN}cd frontend && npm run dev${NC}"
echo ""
echo "3. Open browser:"
echo -e "   ${CYAN}http://localhost:5173${NC}"
echo ""
echo -e "${BOLD}📚 Default admin credentials:${NC}"
echo "   Email: admin@school.local"
echo "   Password: Admin123!@#"
echo ""
print_warning "IMPORTANT: Change the admin password after first login!"
echo ""
