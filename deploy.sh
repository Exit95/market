#!/bin/bash
set -euo pipefail

# Ehren-Deal Deploy Script
# Baut das Docker-Image auf dem Registry-Server und deployt via docker-compose

PVE_HOST="DanapfelPVE"
DOCKER_HOST="root@10.1.9.100"
SSH_KEY="/root/.ssh/danapfel"
IMAGE="localhost:5000/ehren-deal-de:latest"
PROJECT_DIR=$(cd "$(dirname "$0")" && pwd)

echo "=== 1. Source-Code packen ==="
tar czf /tmp/ehren-deal-src.tar.gz \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    --exclude=mobile-app/node_modules \
    --exclude=.env \
    -C "$PROJECT_DIR" .

echo "=== 2. Zum PVE-Host kopieren ==="
scp /tmp/ehren-deal-src.tar.gz ${PVE_HOST}:/tmp/

echo "=== 3. Zum Docker-Server kopieren ==="
ssh ${PVE_HOST} "scp -i ${SSH_KEY} /tmp/ehren-deal-src.tar.gz ${DOCKER_HOST}:/tmp/"

echo "=== 4. Auf Docker-Server bauen + pushen ==="
ssh ${PVE_HOST} "ssh -i ${SSH_KEY} ${DOCKER_HOST} '
    rm -rf /tmp/ehren-deal-build
    mkdir -p /tmp/ehren-deal-build
    cd /tmp/ehren-deal-build
    tar xzf /tmp/ehren-deal-src.tar.gz
    docker build -t ${IMAGE} .
    docker push ${IMAGE}
    rm -rf /tmp/ehren-deal-build /tmp/ehren-deal-src.tar.gz
    echo \"Image gebaut und gepusht\"
'"

echo "=== 5. Container aktualisieren ==="
ssh ${PVE_HOST} "ssh -i ${SSH_KEY} ${DOCKER_HOST} '
    cd /srv/docker/apps
    docker compose pull ehren-deal-de
    docker compose up -d ehren-deal-de
    echo \"Container gestartet\"
'"

echo "=== 6. Warte auf Startup ==="
sleep 10

echo "=== 7. Health-Check ==="
ssh ${PVE_HOST} "ssh -i ${SSH_KEY} ${DOCKER_HOST} '
    docker logs ehren-deal-de --tail=20
'"

echo ""
echo "=== Deploy abgeschlossen ==="
echo "https://ehren-deal.de"

# Cleanup
rm -f /tmp/ehren-deal-src.tar.gz
ssh ${PVE_HOST} "rm -f /tmp/ehren-deal-src.tar.gz" 2>/dev/null || true
