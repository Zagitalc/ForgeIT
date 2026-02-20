#!/bin/bash
cd "$(dirname "$0")"
open -a Docker
echo "Waiting for Docker to start..."
sleep 8
docker run -p 3000:3000 zach1328/forgeit:latest
