@echo off
cd /d C:\Github\emsdk
call emsdk_env.bat

cd /d C:\Github\IBT-Poc

mkdir src\wasm 2>nul
echo 🔨 Compiling Pro C++ Engine to WebAssembly (ES6 Module)...

:: 🔥 NAYA FLAG ADD KIYA HAI: -s EXPORTED_RUNTIME_METHODS
emcc native/engine.cpp ^
  -O3 ^
  -s WASM=1 ^
  -s EXPORTED_FUNCTIONS="['_process_updates', '_get_top_50', '_get_metrics', '_malloc', '_free']" ^
  -s EXPORTED_RUNTIME_METHODS="['HEAPU8', 'HEAPF64']" ^
  -s MODULARIZE=1 ^
  -s EXPORT_ES6=1 ^
  -s EXPORT_NAME="createEngineModule" ^
  -s ALLOW_MEMORY_GROWTH=1 ^
  -s ENVIRONMENT=web,worker ^
  -o src/wasm/engine.js

echo ✅ Build complete!
pause