declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    MAIL_PROVIDER?: 'mailru' | 'resend';
    MAILRU_USER?: string;
    MAILRU_PASSWORD?: string;
    MAILRU_ENABLED?: string;
    MAIL_SETUP_TOKEN?: string;
  }
}
