import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface UploadedStudentFile {
  name: string;
  file_name: string;
  download_url: string;
  url: string;
  file_size: number;
  sizeMb: number;
  type: string;
}

function getR2Client(): S3Client {
  const accountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID || "9a58145ae69d0014e5693b482fead1ad";
  const accessKeyId = process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID || "b61b164a6deed094d7fd8f2fe917ce22";
  const secretAccessKey =
    process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY ||
    "ef9d25e7e4d6e8dfb9d63e2496345a4655694644f68b0a3fcc9986306876185a";

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Sube el archivo entregado por el estudiante directamente a Cloudflare R2
 * y retorna el objeto con URL pública directa para visualización del docente.
 */
export async function uploadStudentFileToR2(
  file: File,
  studentUid: string,
  assignmentId: string
): Promise<UploadedStudentFile> {
  const bucketName = process.env.NEXT_PUBLIC_R2_BUCKET_NAME || "ipt-academy";
  const publicBaseUrl = (
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    "https://pub-f0322ab131db477f82e5ebddb5095957.r2.dev"
  ).replace(/\/$/, "");

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `assignments_submissions/${assignmentId}/${studentUid}_${Date.now()}_${cleanName}`;

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: uint8Array,
      ContentType: file.type || "application/octet-stream",
    })
  );

  const downloadUrl = `${publicBaseUrl}/${key}`;

  return {
    name: file.name,
    file_name: file.name,
    download_url: downloadUrl,
    url: downloadUrl,
    file_size: file.size,
    sizeMb: Number((file.size / (1024 * 1024)).toFixed(2)) || 0.1,
    type: file.type || "application/octet-stream",
  };
}
