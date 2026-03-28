# Ehren-Deal — ehren-deal.de

## Projekt-Info
- **Domain:** ehren-deal.de, www.ehren-deal.de
- **Framework:** Astro
- **Port:** 3000
- **Image:** `10.1.9.0:5000/ehren-deal-de:latest`
- **K8s:** Deployment `ehren-deal-de` in docker-compose.yml

## Architektur
- Astro (statisch generiert)
- Marktplatz-/Deal-Plattform
- Keine Datenbank, kein S3 (aktuell), kein Admin-Dashboard
- Hinweis: S3-Code vorhanden (`s3.ts` mit `S3_PUBLIC_BASE_URL`-Support), aber derzeit nicht aktiv genutzt

## Persistente Daten
- Keine

## Secrets
- Keine Secrets erforderlich (aktuell)

## Deploy
```bash
# Lokal bauen und deployen
./deploy.sh

# Oder manuell:
docker build -t 10.1.9.0:5000/ehren-deal-de:latest .
docker push 10.1.9.0:5000/ehren-deal-de:latest
ssh -i ~/.ssh/danapfel root@10.1.9.100 "cd /srv/docker/apps && docker compose pull/ehren-deal-de -n websites"
```

## Auf den Server gelangen
```bash
# Build muss auf der Registry-VM (10.1.9.0) erfolgen, da lokaler PC keinen Zugriff auf Registry hat
# Option 1: deploy.sh nutzt SSH-Tunnel
./deploy.sh

# Option 2: Source-Code zum Server kopieren und dort bauen
tar czf /tmp/ehren-deal-src.tar.gz --exclude=node_modules --exclude=dist --exclude=.git .
scp /tmp/ehren-deal-src.tar.gz DanapfelPVE:/tmp/
ssh DanapfelPVE "scp -i /root/.ssh/danapfel /tmp/ehren-deal-src.tar.gz root@10.1.9.0:/tmp/"
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.0 'mkdir -p /tmp/build && cd /tmp/build && tar xzf /tmp/ehren-deal-src.tar.gz && docker build -t 10.1.9.0:5000/ehren-deal-de:latest . && docker push 10.1.9.0:5000/ehren-deal-de:latest && rm -rf /tmp/build'"
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 'cd /srv/docker/apps && docker compose pull/ehren-deal-de -n websites'"
```

## Rollback
```bash
ssh -i ~/.ssh/danapfel root@10.1.9.100 "kubectl rollout undo deployment/ehren-deal-de -n websites"
```

## Logs pruefen
```bash
ssh -i ~/.ssh/danapfel root@10.1.9.100 "kubectl logs -n websites -l app=ehren-deal-de --tail=50"
```

## Debugging
```bash
# Pod-Status
ssh -i ~/.ssh/danapfel root@10.1.9.100 "kubectl get pods -n websites -l app=ehren-deal-de"

# Shell im Pod
ssh -i ~/.ssh/danapfel root@10.1.9.100 "kubectl exec -it -n websites deployment/ehren-deal-de -- sh"
```

## Infrastruktur
- **Server:** 148.251.51.53 (Hetzner, Proxmox VE)
- **Docker Cluster:** 3 Nodes (10.1.9.100, .101, .102)
- **Registry:** 10.1.9.0:5000 (VM 1900)
- **TLS:** cert-manager + Let's Encrypt (automatisch)
- **Ingress:** Traefik (Namespace traefik)
- **Monitoring:** Grafana unter grafana.danapfel-digital.de
