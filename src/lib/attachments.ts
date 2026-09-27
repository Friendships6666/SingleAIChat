import type { Attachment, Content } from '../types';

export async function readAttachments(files: FileList | File[]): Promise<Attachment[]> {
  return Promise.all(Array.from(files).map(async file => ({
    name: file.name, size: file.size, isImage: file.type.startsWith('image/'),
    data: file.type.startsWith('image/') ? await readDataUrl(file) : await file.text(),
    ext: file.name.split('.').pop()?.toLowerCase() || ''
  })));
}
function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
export function makeUserContent(query: string, attachments: Attachment[]): Content {
  const textFiles = attachments.filter(file => !file.isImage);
  const images = attachments.filter(file => file.isImage);
  let text = '';
  if (textFiles.length) {
    text = '【附件内容如下】:\n';
    for (const file of textFiles) text += `\n--- 文件: ${file.name} ---\n\`\`\`${file.ext}\n${file.data}\n\`\`\`\n`;
    text += '\n【提问】:\n';
  }
  text += query || (attachments.length ? '请分析上述附件/图片内容。' : '');
  return images.length ? [{ type: 'text', text }, ...images.map(file => ({ type: 'image_url' as const, image_url: { url: file.data } }))] : text;
}
