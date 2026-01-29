#!/bin/bash

# Build script for HealthTrack Pro WordPress Plugin
# Creates a ZIP file ready for WordPress installation

set -e

PLUGIN_NAME="healthtrack-pro"
PLUGIN_DIR="integrations/wordpress"
BUILD_DIR="dist/wordpress"
VERSION="1.0.0"

echo "Building HealthTrack Pro WordPress Plugin v${VERSION}..."

# Create build directory
mkdir -p "${BUILD_DIR}"

# Create plugin directory structure
mkdir -p "${BUILD_DIR}/${PLUGIN_NAME}"

# Copy plugin files
cp "${PLUGIN_DIR}/healthtrack-pro.php" "${BUILD_DIR}/${PLUGIN_NAME}/"
cp "${PLUGIN_DIR}/readme.txt" "${BUILD_DIR}/${PLUGIN_NAME}/"

# Create ZIP file
cd "${BUILD_DIR}"
zip -r "${PLUGIN_NAME}-${VERSION}.zip" "${PLUGIN_NAME}"

# Cleanup
rm -rf "${PLUGIN_NAME}"

echo "Build complete: ${BUILD_DIR}/${PLUGIN_NAME}-${VERSION}.zip"
echo ""
echo "Installation instructions:"
echo "1. Go to WordPress Admin > Plugins > Add New > Upload Plugin"
echo "2. Upload ${PLUGIN_NAME}-${VERSION}.zip"
echo "3. Activate the plugin"
echo "4. Go to Settings > HealthTrack Pro to configure"
