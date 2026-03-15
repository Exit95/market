/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
    // App
    readonly APP_URL: string;

    // S3 / Storage
    readonly S3_ENDPOINT: string;
    readonly S3_REGION: string;
    readonly S3_BUCKET: string;
    readonly S3_ACCESS_KEY: string;
    readonly S3_SECRET_KEY: string;

    // IDnow KYC
    readonly IDNOW_API_KEY: string;
    readonly IDNOW_COMPANY_ID: string;
    readonly IDNOW_BASE_URL: string;

    // Mangopay
    readonly MANGOPAY_CLIENT_ID: string;
    readonly MANGOPAY_API_KEY: string;
    readonly MANGOPAY_BASE_URL: string;

    // Algolia
    readonly ALGOLIA_APP_ID: string;
    readonly ALGOLIA_ADMIN_KEY: string;
    readonly ALGOLIA_SEARCH_KEY: string;
    readonly ALGOLIA_INDEX_NAME: string;

    // SMTP / Nodemailer
    readonly SMTP_HOST: string;
    readonly SMTP_PORT: string;
    readonly SMTP_SECURE: string;
    readonly SMTP_USER: string;
    readonly SMTP_PASS: string;
    readonly SMTP_FROM: string;
    readonly S3_BUCKET_PUBLIC: string;
    readonly S3_PUBLIC_BASE_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}