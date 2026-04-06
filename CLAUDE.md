# Ehren-Deal — ehren-deal.de

## Projekt-Info
- **Domain:** ehren-deal.de, www.ehren-deal.de
- **Framework:** Astro 5 SSR (Node.js Adapter)
- **Port:** 3000
- **Image:** `localhost:5000/ehren-deal-de:latest`
- **Container:** `ehren-deal-de` via docker-compose

## Architektur
- Astro 5 SSR mit Node.js-Adapter
- React 19 für interaktive Komponenten
- Prisma 6 ORM mit MySQL (MariaDB)
- Marktplatz-Plattform + Leistungstausch (Dienstleistung gegen Dienstleistung)
- Lucia Auth v3 (Session-basiert)
- Ably für Echtzeit-Chat
- Stripe + Mangopay (Zahlungen/Escrow)
- Algolia (Volltextsuche)
- S3/MinIO (Datei-Uploads)
- Nodemailer (E-Mail)

## Persistente Daten
- **MySQL/MariaDB:** Container `mariadb-ehren` auf 10.1.9.100
- **Datenbank:** `ehren_deal`

## Secrets
- `DATABASE_URL` — MySQL-Verbindung
- `SMTP_*` — Mailserver (rejectUnauthorized muss false bleiben, interner Mailserver)
- Weitere in `.env` (Stripe, Ably, Algolia, S3, IDnow)

## Deploy
```bash
# Automatisch bauen und deployen
./deploy.sh

# Oder manuell:
tar czf /tmp/ehren-deal-src.tar.gz --exclude=node_modules --exclude=dist --exclude=.git --exclude=.env .
scp /tmp/ehren-deal-src.tar.gz DanapfelPVE:/tmp/
ssh DanapfelPVE "scp -i /root/.ssh/danapfel /tmp/ehren-deal-src.tar.gz root@10.1.9.100:/tmp/"
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 '
    rm -rf /tmp/ehren-deal-build && mkdir -p /tmp/ehren-deal-build && cd /tmp/ehren-deal-build
    tar xzf /tmp/ehren-deal-src.tar.gz
    docker build -t localhost:5000/ehren-deal-de:latest .
    docker push localhost:5000/ehren-deal-de:latest
    rm -rf /tmp/ehren-deal-build /tmp/ehren-deal-src.tar.gz'"
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 '
    cd /srv/docker/apps && docker compose pull ehren-deal-de && docker compose up -d ehren-deal-de'"
```

## Nach dem Deploy (DB-Migrationen)
```bash
# Schema synchronisieren (Prisma 6 explizit, da Container Prisma 7 hat)
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 '
    docker exec ehren-deal-de npx prisma@6 db push --accept-data-loss'"

# Kategorien seeden (bei Erstinstallation)
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 '
    docker exec ehren-deal-de npx tsx prisma/seed-service-categories.ts'"
```

## Rollback
```bash
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 '
    cd /srv/docker/apps && docker compose up -d ehren-deal-de'"
```

## Logs prüfen
```bash
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 '
    docker logs ehren-deal-de --tail=50'"
```

## Debugging
```bash
# Container-Status
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 '
    docker ps -f name=ehren-deal-de'"

# Shell im Container
ssh DanapfelPVE "ssh -i /root/.ssh/danapfel root@10.1.9.100 '
    docker exec -it ehren-deal-de sh'"
```

## Infrastruktur
- **Server:** 148.251.51.53 (Hetzner, Proxmox VE)
- **Docker-Server:** 10.1.9.100 (VM 2000 `docker-server`)
- **Registry:** localhost:5000 (Container auf 10.1.9.100)
- **MariaDB:** Container `mariadb-ehren` auf 10.1.9.100
- **TLS:** Let's Encrypt (automatisch via Traefik)
- **Reverse Proxy:** Traefik (Container auf 10.1.9.100)
- **Monitoring:** Grafana unter grafana.danapfel-digital.de

## Leistungstausch-Feature
- **URL:** `/leistungstausch/`
- **Akzentfarbe:** Teal (#0D9488) — visuell getrennt vom Marktplatz (Blau #1B65A6)
- **Prisma-Modelle:** ServiceCategory, ServiceListing, ServiceProposal, ServiceDeal, ServiceReview, ServiceDispute, ServiceProfile
- **API:** Alle Endpunkte unter `/api/leistungstausch/`
- **Content-Filter:** Anti-Diskriminierung + Geld/Waren-Erkennung (`src/lib/service-content-filter.ts`)
- **Spec:** `docs/superpowers/specs/2026-04-06-leistungstausch-design.md`
