import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import sharp from 'sharp';
import { uploadFile, deleteFile } from '../utils/s3.js';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 400;

export async function uploadRoutes(app: FastifyInstance) {
  // POST /image - upload image
  app.post('/image', { preHandler: [authenticate] }, async (request, reply) => {
    const file = await request.file();

    if (!file) {
      return reply.status(400).send({ error: 'Keine Datei hochgeladen.' });
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return reply.status(400).send({
        error: 'Ungueltiger Dateityp. Erlaubt: JPEG, PNG, WebP, AVIF.',
      });
    }

    const buffer = await file.toBuffer();

    if (buffer.length > 10 * 1024 * 1024) {
      return reply.status(400).send({ error: 'Datei ist zu gross. Maximal 10 MB.' });
    }

    const id = nanoid();
    const ext = 'webp';

    // Process main image
    const mainBuffer = await sharp(buffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();

    const mainKey = `listings/${id}.${ext}`;
    const mainUrl = await uploadFile(mainBuffer, mainKey, 'image/webp');

    // Process thumbnail
    const thumbBuffer = await sharp(buffer)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: 'cover',
      })
      .webp({ quality: 75 })
      .toBuffer();

    const thumbKey = `listings/thumbs/${id}.${ext}`;
    const thumbUrl = await uploadFile(thumbBuffer, thumbKey, 'image/webp');

    return reply.status(201).send({
      url: mainUrl,
      thumbnailUrl: thumbUrl,
      key: mainKey,
      thumbnailKey: thumbKey,
    });
  });

  // DELETE /image - delete image from S3
  app.delete('/image', { preHandler: [authenticate] }, async (request, reply) => {
    const { key } = request.query as { key?: string };

    if (!key) {
      return reply.status(400).send({ error: 'Parameter "key" ist erforderlich.' });
    }

    // Only allow deleting from the listings/ prefix for safety
    if (!key.startsWith('listings/')) {
      return reply.status(400).send({ error: 'Ungueltiger Schluessel.' });
    }

    // Ownership check: verify the image belongs to a listing owned by the user
    const profile = await prisma.profile.findUnique({ where: { userId: request.user!.id } });
    if (!profile) {
      return reply.status(404).send({ error: 'Profil nicht gefunden.' });
    }

    const imageRecord = await prisma.listingImage.findFirst({
      where: { url: { contains: key } },
      include: { listing: { select: { sellerId: true } } },
    });

    if (imageRecord && imageRecord.listing.sellerId !== profile.id) {
      return reply.status(403).send({ error: 'Du kannst nur eigene Bilder loeschen.' });
    }

    try {
      await deleteFile(key);

      // Also try to delete the thumbnail if it exists
      if (!key.includes('/thumbs/')) {
        const thumbKey = key.replace('listings/', 'listings/thumbs/');
        await deleteFile(thumbKey).catch(() => {});
      }

      return reply.send({ message: 'Bild geloescht.' });
    } catch (err) {
      return reply.status(500).send({ error: 'Fehler beim Loeschen des Bildes.' });
    }
  });
}
