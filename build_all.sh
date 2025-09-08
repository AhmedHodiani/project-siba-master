#!/bin/bash
set -e

# ===============================================================
# PROJECT SIBA - Premium Build Script
# ===============================================================

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Unicode box drawing characters
TOP_LEFT="+"
TOP_RIGHT="+"
BOTTOM_LEFT="+"
BOTTOM_RIGHT="+"
HORIZONTAL="-"
VERTICAL="|"
HEAVY_HORIZONTAL="="
HEAVY_VERTICAL="|"
CROSS="+"

# Function to print a fancy header
print_header() {
    local title="$1"
    local width=70
    local padding=$(( (width - ${#title} - 2) / 2 ))
    
    echo -e "${CYAN}${TOP_LEFT}$(printf "%*s" $width | tr ' ' "${HEAVY_HORIZONTAL}")${TOP_RIGHT}${NC}"
    echo -e "${CYAN}${HEAVY_VERTICAL}${NC}$(printf "%*s" $padding)${WHITE}${BOLD}$title${NC}$(printf "%*s" $padding)${CYAN}${HEAVY_VERTICAL}${NC}"
    echo -e "${CYAN}${BOTTOM_LEFT}$(printf "%*s" $width | tr ' ' "${HEAVY_HORIZONTAL}")${BOTTOM_RIGHT}${NC}"
    echo
}

# Function to print step boxes
print_step() {
    local step="$1"
    local description="$2"
    echo -e "${BLUE}${TOP_LEFT}${HORIZONTAL}${HORIZONTAL}${HORIZONTAL}${TOP_RIGHT} ${YELLOW}${BOLD}Step $step${NC} ${WHITE}$description${NC}"
}

# Function to print success messages
print_success() {
    local message="$1"
    echo -e "${GREEN}${BOLD}   ✓${NC} ${GREEN}$message${NC}"
    echo
}

# Function to print info messages
print_info() {
    local message="$1"
    echo -e "${BLUE}${BOLD}   i${NC} ${CYAN}$message${NC}"
}

# Function to print warning messages
print_warning() {
    local message="$1"
    echo -e "${YELLOW}${BOLD}   !${NC} ${YELLOW}$message${NC}"
}

# Function to print error messages
print_error() {
    local message="$1"
    echo -e "${RED}${BOLD}   ✗${NC} ${RED}$message${NC}"
}

# Function to print progress
print_progress() {
    local message="$1"
    echo -e "${PURPLE}${BOLD}   ◉${NC} ${PURPLE}$message${NC}"
}

# Function to create a fancy separator
print_separator() {
    echo -e "${GRAY}$(printf "%*s" 70 | tr ' ' "${HORIZONTAL}")${NC}"
}

# Start of script
clear
print_header "[*] PROJECT SIBA BUILD SYSTEM"

echo -e "${WHITE}${BOLD}Movie Library with Advanced Language Learning${NC}"
echo -e "${GRAY}Electron + React + PocketBase + FSRS + AI Integration${NC}"
echo
print_separator
echo

# Step 1: Version Input
print_step "1" "Version Configuration"
echo -e "${WHITE}Please enter the new version number for this release.${NC}"
echo -e "${GRAY}Format: MAJOR.MINOR.PATCH (e.g., 1.3.1)${NC}"
echo
read -p "$(echo -e "${CYAN}${BOLD}Version >> ${NC}")" VERSION

if [[ -z "$VERSION" ]]; then
    print_error "Version number cannot be empty!"
    echo -e "${RED}${BOLD}Build process terminated.${NC}"
    exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    print_warning "Version format doesn't match semantic versioning (x.y.z)"
    read -p "$(echo -e "${YELLOW}Continue anyway? (y/N): ${NC}")" CONTINUE
    if [[ "$CONTINUE" != "y" && "$CONTINUE" != "Y" ]]; then
        print_error "Build cancelled by user"
        exit 1
    fi
fi

print_success "Version set to: $VERSION"

# Step 2: Update package.json
print_step "2" "Package Configuration"
print_progress "Updating root package.json with new version..."

if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed. Please install jq first."
    exit 1
fi

if jq ".version=\"$VERSION\"" package.json > package.tmp.json && mv package.tmp.json package.json; then
    print_success "Updated root package.json to version $VERSION"
else
    print_error "Failed to update package.json"
    exit 1
fi

# Step 3: Clean previous builds
print_step "3" "Environment Cleanup"
print_progress "Cleaning previous release artifacts..."

if [[ -d "release/" ]]; then
    rm -rf release/
    print_info "Removed existing release directory"
fi

mkdir -p release/app
print_success "Created clean build environment"

# Step 4: Create release package.json
print_step "4" "Release Package Configuration"
print_progress "Creating optimized package.json for release..."

cat > release/app/package.json <<EOL
{
  "name": "project-siba-master",
  "version": "$VERSION",
  "author": {
    "name": "Ahmed Hodiani",
    "email": "a.hodiani@hotmail.com"
  },
  "main": "./dist/main/main.js"
}
EOL

print_success "Created minimal release package.json"

# Step 5: Build processes
print_step "5" "Application Build Process"
print_separator

echo -e "${CYAN}${BOLD}Building Main Process...${NC}"
print_progress "Compiling Electron main process (TypeScript → JavaScript)"
if npm run build:main; then
    print_success "Main process build completed"
else
    print_error "Main process build failed"
    exit 1
fi

echo
echo -e "${CYAN}${BOLD}Building Renderer Process...${NC}"
print_progress "Compiling React renderer (TypeScript + Webpack)"
if npm run build:renderer; then
    print_success "Renderer process build completed"
else
    print_error "Renderer process build failed"
    exit 1
fi

print_separator

# Step 6: Platform packaging
print_step "6" "Cross-Platform Packaging"
print_separator

echo -e "${CYAN}${BOLD}[WIN] Windows Build${NC}"
print_progress "Creating Windows executable and installer..."
if npm run dist:win; then
    print_success "Windows build completed successfully"
else
    print_error "Windows build failed"
    exit 1
fi

echo
echo -e "${CYAN}${BOLD}[LNX] Linux Build${NC}"
print_progress "Creating Linux AppImage and packages..."
if npm run dist:linux; then
    print_success "Linux build completed successfully"
else
    print_error "Linux build failed"
    exit 1
fi

print_separator

# Step 7: GitHub publishing
print_step "7" "Release Publishing"
echo -e "${WHITE}Do you want to publish this release to GitHub?${NC}"
echo -e "${GRAY}This will create a new release with built artifacts${NC}"
echo
read -p "$(echo -e "${PURPLE}${BOLD}Publish to GitHub? (y/N): ${NC}")" PUBLISH

if [[ "$PUBLISH" == "y" || "$PUBLISH" == "Y" ]]; then
    echo
    echo -e "${WHITE}Opening GitHub Personal Access Tokens page...${NC}"
    echo -e "${GRAY}Create a new token with 'repo' and 'write:packages' permissions${NC}"
    
    # Try to open the GitHub tokens page
    if command -v xdg-open &> /dev/null; then
        xdg-open "https://github.com/settings/tokens" &
    elif command -v open &> /dev/null; then
        open "https://github.com/settings/tokens" &
    else
        echo -e "${YELLOW}${BOLD}   !${NC} ${YELLOW}Could not open browser automatically${NC}"
        echo -e "${CYAN}Please visit: ${WHITE}https://github.com/settings/tokens${NC}"
    fi
    
    echo
    echo -e "${WHITE}Please enter your GitHub Personal Access Token:${NC}"
    echo -e "${GRAY}(Token will not be displayed for security)${NC}"
    read -s -p "$(echo -e "${CYAN}${BOLD}GitHub Token >> ${NC}")" GH_TOKEN
    echo
    
    if [[ -z "$GH_TOKEN" ]]; then
        print_error "GitHub token cannot be empty!"
        print_info "Skipping GitHub publish - builds are ready locally"
    else
        export GH_TOKEN
        print_progress "Publishing release to GitHub..."
        if npx electron-builder --publish always; then
            print_success "Successfully published to GitHub"
        else
            print_error "GitHub publishing failed"
            exit 1
        fi
    fi
else
    print_info "Skipping GitHub publish - builds are ready locally"
fi

# Final success message
echo
print_separator
print_header "[✓] BUILD COMPLETE"

echo -e "${GREEN}${BOLD}*** All builds completed successfully!${NC}"
echo
echo -e "${WHITE}${BOLD}Build Summary:${NC}"
echo -e "${CYAN}   * Version:${NC} $VERSION"
echo -e "${CYAN}   * Platforms:${NC} Windows, Linux"
echo -e "${CYAN}   * Location:${NC} ./release/build/"
echo -e "${CYAN}   * Status:${NC} ${GREEN}Ready for distribution${NC}"
echo
echo -e "${GRAY}Thank you for using Project SIBA Build System!${NC}"
echo