#!/bin/bash

# Exit on error
set -e

echo "--- Starting Vercel Build for Blackhole Simulation ---"

# 1. Install Rust if not present
if ! command -v rustc &> /dev/null; then
    echo "Rust not found. Installing..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
else
    echo "Rust is already installed."
fi

# Ensure cargo is in PATH
export PATH="$HOME/.cargo/bin:$PATH"

# 2. Add WASM target
echo "Adding wasm32-unknown-unknown target..."
rustup target add wasm32-unknown-unknown

# 3. Install wasm-pack (if binary not found)
# Note: wasm-pack is also in devDependencies, but we ensure binary is available
if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack not found. Installing binary..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
else
    echo "wasm-pack is already available."
fi

# 4. Build the physics engine
echo "Building WASM physics engine..."
cd physics-engine
# Use single job to prevent OOM in Vercel's build environment
CARGO_BUILD_JOBS=1 wasm-pack build --target web --out-dir ../public/wasm --no-typescript
cd ..

# 6. Run the Next.js build
echo "Running Next.js build..."
next build

echo "--- Vercel Build Complete ---"
