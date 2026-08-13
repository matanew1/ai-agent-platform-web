export type EncodedAttachment = { filename: string; content_base64: string };

export async function fileToAttachment(file: File): Promise<EncodedAttachment> {
  const encoded = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return { filename: file.name, content_base64: encoded };
}
