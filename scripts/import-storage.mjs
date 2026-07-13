import { promises as fs } from 'fs';
import path from 'path';

const args = process.argv.slice(2);

function getArg(name, fallback = null) {
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith('--')) {
    return args[index + 1];
  }

  const prefix = `--${name}=`;
  const match = args.find((value) => value.startsWith(prefix));
  if (match) {
    return match.slice(prefix.length);
  }

  return fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function parseEnvFile(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

async function loadEnvFile(filePath) {
  try {
    const envFile = await fs.readFile(filePath, 'utf8');
    const values = parseEnvFile(envFile);
    for (const [key, value] of Object.entries(values)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    return true;
  } catch {
    return false;
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readDirEntries(dirPath) {
  return fs.readdir(dirPath, { withFileTypes: true });
}

async function resolveStorageRoot(inputPath) {
  let current = path.resolve(inputPath);
  if (!(await pathExists(current))) {
    throw new Error(`Storage source not found: ${current}`);
  }

  while (true) {
    const entries = await readDirEntries(current);
    const directories = entries.filter((entry) => entry.isDirectory());
    const files = entries.filter((entry) => entry.isFile());

    if (directories.length === 1 && files.length === 0) {
      current = path.join(current, directories[0].name);
      continue;
    }

    break;
  }

  return current;
}

async function walkFiles(rootDir) {
  const items = [];

  async function visit(currentDir) {
    const entries = await readDirEntries(currentDir);
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      if (entry.isFile()) {
        if (entry.name === '.emptyFolderPlaceholder' || entry.name === 'desktop.ini') {
          continue;
        }
        items.push(absolutePath);
      }
    }
  }

  await visit(rootDir);
  return items;
}

function getContentType(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
  };

  return map[extension] || 'application/octet-stream';
}

function encodeObjectPath(relativePath) {
  return relativePath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function normalizeBucketName(name) {
  return name;
}

async function apiRequest(supabaseUrl, serviceKey, endpoint, options = {}) {
  const response = await fetch(`${supabaseUrl}${endpoint}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const parsed = text ? safeJsonParse(text) : null;

  return {
    ok: response.ok,
    status: response.status,
    data: parsed ?? text,
  };
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function ensureBucket(supabaseUrl, serviceKey, bucketName) {
  const listResult = await apiRequest(supabaseUrl, serviceKey, '/storage/v1/bucket');
  if (!listResult.ok) {
    throw new Error(`Failed to list buckets: ${listResult.status} ${JSON.stringify(listResult.data)}`);
  }

  const existingBuckets = Array.isArray(listResult.data) ? listResult.data : [];
  if (existingBuckets.some((bucket) => bucket.id === bucketName)) {
    return;
  }

  const createResult = await apiRequest(supabaseUrl, serviceKey, '/storage/v1/bucket', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      id: bucketName,
      name: bucketName,
      public: true,
    }),
  });

  if (!createResult.ok) {
    throw new Error(`Failed to create bucket ${bucketName}: ${createResult.status} ${JSON.stringify(createResult.data)}`);
  }
}

async function uploadObject(supabaseUrl, serviceKey, bucketName, objectPath, fileBuffer, contentType, dryRun) {
  const encodedPath = encodeObjectPath(objectPath);
  const endpoint = `/storage/v1/object/${encodeURIComponent(bucketName)}/${encodedPath}`;

  if (dryRun) {
    console.log(`[dry-run] ${bucketName}/${objectPath}`);
    return;
  }

  const response = await fetch(`${supabaseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': contentType,
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Upload failed for ${bucketName}/${objectPath}: ${response.status} ${bodyText}`);
  }
}

async function main() {
  const defaultDownloads = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads');
  const sourceArg = getArg('source') || getArg('from') || path.join(defaultDownloads, 'uiegfwnlphfblvzupziu.storage');
  const envArg = getArg('env') || path.join('mobile', '.env');
  const dryRun = hasFlag('dry-run');

  const sourcePath = path.resolve(sourceArg);
  const envPath = path.resolve(envArg);

  await loadEnvFile(envPath);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in the env file.');
  }

  const storageRoot = await resolveStorageRoot(sourcePath);
  console.log(`Storage root: ${storageRoot}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : 'upload'}`);

  const bucketEntries = await readDirEntries(storageRoot);
  const buckets = bucketEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  if (buckets.length === 0) {
    throw new Error(`No bucket directories found in ${storageRoot}`);
  }

  let uploaded = 0;
  let skipped = 0;

  for (const bucketName of buckets) {
    const normalizedBucket = normalizeBucketName(bucketName);
    const bucketPath = path.join(storageRoot, bucketName);
    const bucketFiles = await walkFiles(bucketPath);

    console.log(`Bucket ${normalizedBucket}: ${bucketFiles.length} file(s)`);

    if (!dryRun) {
      await ensureBucket(supabaseUrl, serviceKey, normalizedBucket);
    }

    for (const filePath of bucketFiles) {
      const relativePath = path.relative(bucketPath, filePath);
      const objectPath = relativePath.split(path.sep).join('/');
      if (objectPath === '.emptyFolderPlaceholder' || objectPath === 'desktop.ini') {
        skipped += 1;
        continue;
      }
      const fileBuffer = await fs.readFile(filePath);
      const contentType = getContentType(filePath);

      try {
        await uploadObject(supabaseUrl, serviceKey, normalizedBucket, objectPath, fileBuffer, contentType, dryRun);
        uploaded += 1;
      } catch (error) {
        skipped += 1;
        console.error(`Failed: ${normalizedBucket}/${objectPath}`);
        console.error(error.message);
      }
    }
  }

  console.log(`Done. Uploaded: ${uploaded}. Failed: ${skipped}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});