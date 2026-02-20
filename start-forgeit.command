#!/bin/bash
cd "$(dirname "$0")"
open -a Docker
echo "Waiting for Docker to start..."
sleep 8
docker compose up
