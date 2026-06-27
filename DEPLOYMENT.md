# Ehren-Deal Deployment

## Domain
- `ehren-deal.de`
- `www.ehren-deal.de`

## Image
- Registry: `10.1.9.0:5000/ehren-deal-de:latest`
- Port: `3000`

## K8s
- Namespace: `websites`
- Typ: Deployment
- Ingress: cert-manager (Let's Encrypt)

## Secrets
- Keine projektspezifischen Secrets erforderlich

## Deploy
```bash
./deploy.sh
```

## Rollback
```bash
ssh -i ~/.ssh/danapfel root@10.1.9.100 "kubectl rollout undo deployment/ehren-deal-de -n websites"
```
