import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "06e492e54cfa8e355cb567e25ef5f884";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "3691bada229bcbe15e1ff38919028a6a";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "9d270aeeb6a8951c374a914369524c30b32160ec6ee6ecd6f2c0484a0aba6019";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "eljabal";
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadBackupToR2(filename: string, contentStr: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: `backups/${filename}`,
    Body: Buffer.from(contentStr, "utf-8"),
    ContentType: "application/json",
  });

  await r2Client.send(command);
  return {
    key: `backups/${filename}`,
    filename,
    url: `${R2_ENDPOINT}/${R2_BUCKET_NAME}/backups/${filename}`,
  };
}

export async function listR2Backups() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: "backups/",
    });

    const response = await r2Client.send(command);
    const items = response.Contents || [];

    return items
      .map((item) => {
        const key = item.Key || "";
        const filename = key.replace(/^backups\//, "");
        return {
          key,
          filename: filename || key,
          size: item.Size || 0,
          lastModified: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
        };
      })
      .filter((b) => b.filename.length > 0)
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  } catch (error: any) {
    console.warn("R2 list backups error:", error);
    return [];
  }
}

export async function getBackupFromR2(key: string) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  const str = await response.Body?.transformToString("utf-8");
  return str;
}

export async function getObjectFromR2(key: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);
    if (!response.Body) return null;

    const byteArray = await response.Body.transformToByteArray();
    return {
      buffer: Buffer.from(byteArray),
      contentType: response.ContentType || "image/jpeg",
    };
  } catch (e) {
    console.warn("R2 get object error:", e);
    return null;
  }
}

export async function deleteBackupFromR2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
  return { success: true };
}

// ==========================================
// PROJECT FILES R2 HELPERS
// ==========================================
export async function uploadProjectFileToR2(projectId: string, filename: string, buffer: Buffer, contentType: string) {
  const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
  const key = `projects/${projectId}/${safeFilename}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType || "application/octet-stream",
  });

  await r2Client.send(command);

  return {
    key,
    filename,
    safeFilename,
    url: `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`,
    contentType,
  };
}

export async function listProjectFilesR2(projectId: string) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: `projects/${projectId}/`,
    });

    const response = await r2Client.send(command);
    const items = response.Contents || [];

    return items.map((item) => {
      const key = item.Key || "";
      const rawName = key.replace(`projects/${projectId}/`, "");
      const cleanName = rawName.replace(/^\d+_/, "");
      return {
        key,
        filename: cleanName || rawName,
        size: item.Size || 0,
        lastModified: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
      };
    });
  } catch (e) {
    console.warn("R2 list project files error:", e);
    return [];
  }
}

// ==========================================
// EMPLOYEE FILES R2 HELPERS
// ==========================================
export async function uploadEmployeeDocumentToR2(
  employeeId: string,
  filename: string,
  buffer: Buffer,
  contentType: string
) {
  const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
  const key = `employees/${employeeId}/${safeFilename}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType || "application/octet-stream",
  });

  await r2Client.send(command);

  return {
    key,
    filename,
    safeFilename,
    url: `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`,
    contentType,
  };
}

export async function deleteR2Object(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
  return { success: true };
}

export async function uploadLogoToR2(filename: string, buffer: Buffer, contentType: string) {
  const safeFilename = `logo_${Date.now()}_${filename.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
  const key = `settings/${safeFilename}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType || "image/png",
  });

  await r2Client.send(command);

  return {
    key,
    url: `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`,
  };
}


