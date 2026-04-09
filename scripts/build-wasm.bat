@echo off

cd /d C:\Github\emsdk
call emsdk_env.bat

cd /d C:\Github\IBT-Poc

mkdir public\wasm 2>nul

echo 🔨 Compiling C++ to WebAssembly...

emcc native/engine.cpp ^
  -O3 ^
  -s WASM=1 ^
  -s EXPORTED_FUNCTIONS="['_process_tick']" ^
  -s MODULARIZE=1 ^
  -s EXPORT_NAME="createEngineModule" ^
  -s ALLOW_MEMORY_GROWTH=1 ^
  -s ENVIRONMENT=web,worker ^
  -o public/wasm/engine.js

echo ✅ Build complete!
pause