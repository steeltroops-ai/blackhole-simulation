# Rust Build Troubleshooting

If you encounter `os error 32` (File used by another process) during `cargo build` or `wasm-pack build`:

1.  **Close Visual Studio Code** completely.
2.  **Open Task Manager** and end any `cargo.exe`, `rust-analyzer.exe`, or `rls.exe` processes.
3.  **Delete the `target` directory** manually in `src/rust/`.
4.  **Re-open VS Code** and run `npm run dev` (or `bun run dev`).

This error is caused by the Rust Language Server locking build artifacts on Windows while the build process tries to write to them.

## Manual Build
To build the WASM module manually:

```bash
cd src/rust
wasm-pack build --target web --out-dir ../../../public/wasm --no-typescript
```
