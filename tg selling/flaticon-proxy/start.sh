#!/bin/bash
# Flaticon FREE Icons Proxy - Setup & Run
# =========================================

# 1. Install dependencies
pip install flask flask-cors curl_cffi

# 2. Download bore (if not installed)
if ! command -v bore &> /dev/null; then
    echo "Installing bore..."
    curl -sL "https://github.com/ekzhang/bore/releases/download/v0.5.2/bore-v0.5.2-x86_64-unknown-linux-musl.tar.gz" -o /tmp/bore.tar.gz
    tar xzf /tmp/bore.tar.gz -C /usr/local/bin/ bore
    chmod +x /usr/local/bin/bore
fi

# 3. Start server in background
echo "Starting server on port 8080..."
python3 server.py &
sleep 2

# 4. Start bore tunnel
echo "Creating public tunnel..."
bore local 8080 --to bore.pub
# The tunnel URL will be printed in the output
