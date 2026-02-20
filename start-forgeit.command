#!/bin/bash
cd "$(dirname "$0")"
open -a Docker
echo "Waiting for Docker to start..."
sleep 8

# Stop any running container already bound to port 3000 to avoid conflicts.
existing_ids=$(docker ps -q --filter "publish=3000")
if [ -n "$existing_ids" ]; then
  echo "Stopping container(s) already using port 3000..."
  docker stop $existing_ids >/dev/null
fi

# Remove previous named ForgeIT container if it exists.
docker rm -f forgeit >/dev/null 2>&1

docker run --name forgeit --rm -p 3000:3000 zach1328/forgeit:latest
