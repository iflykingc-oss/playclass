import { describe, expect, it } from 'vitest';
import { s3ClientOptionsFromEnv } from '../../lib/persistence/asset-byte-store';

describe('WP1.5 S3 custom endpoint / MinIO (#1686)', () => {
  it('defaults to virtual-host AWS style with no endpoint', () => {
    const opts = s3ClientOptionsFromEnv({} as unknown as NodeJS.ProcessEnv);
    expect(opts.endpoint).toBeUndefined();
    expect(opts.forcePathStyle).toBeUndefined();
    expect(opts.region).toBe('us-east-1');
  });

  it('uses custom endpoint and force path-style for MinIO-like stores', () => {
    const opts = s3ClientOptionsFromEnv({
      ASSET_S3_ENDPOINT: 'http://127.0.0.1:9000',
      AWS_REGION: 'us-east-1',
    } as unknown as NodeJS.ProcessEnv);
    expect(opts.endpoint).toBe('http://127.0.0.1:9000');
    expect(opts.forcePathStyle).toBe(true);
    expect(opts.region).toBe('us-east-1');
  });

  it('honours AWS_ENDPOINT_URL and explicit path-style flag', () => {
    const opts = s3ClientOptionsFromEnv({
      AWS_ENDPOINT_URL: 'https://r2.cloudflarestorage.com',
      AWS_S3_FORCE_PATH_STYLE: 'true',
    } as unknown as NodeJS.ProcessEnv);
    expect(opts.endpoint).toBe('https://r2.cloudflarestorage.com');
    expect(opts.forcePathStyle).toBe(true);
  });

  it('loadS3AssetByteStore accepts client options', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const src = readFileSync(
      'packages/@openmaic/storage/src/asset/s3-bytes.ts',
      'utf-8',
    );
    expect(src).toContain('clientOptions');
    expect(src).toContain('new sdk.S3Client(clientOptions)');
  });
});
