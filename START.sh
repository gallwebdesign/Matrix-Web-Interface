#!/bin/bash

# Video Matrix Controller Launcher

echo "============================================"
echo "   Video Matrix Controller"
echo "   Starting server..."
echo "============================================"
echo ""

# Get the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Start the Node.js server in background
node server-secure.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Open browser based on OS
echo "Opening browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v xdg-open > /dev/null; then
        xdg-open http://localhost:3000
    elif command -v gnome-open > /dev/null; then
        gnome-open http://localhost:3000
    fi
fi

echo ""
echo "============================================"
echo "Server is running!"
echo "Access the interface at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "============================================"
echo ""

# Wait for Ctrl+C
trap "kill $SERVER_PID; exit" INT
wait $SERVER_PID
