#!/bin/bash
# Start Flask backend in background
python3 app_sqlite.py &

# Wait a moment to let Flask initialize
sleep 2

# Start Vite frontend
npm run dev
