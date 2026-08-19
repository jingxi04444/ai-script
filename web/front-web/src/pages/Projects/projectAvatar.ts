const AVATAR_OPTIMIZE_THRESHOLD = 320 * 1024;
const AVATAR_MAX_EDGE = 640;
const AVATAR_WEBP_QUALITY = 0.82;

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('项目头像解析失败'));
  image.src = url;
});

const canvasToBlob = (canvas: HTMLCanvasElement) => new Promise<Blob | null>((resolve) => {
  canvas.toBlob(resolve, 'image/webp', AVATAR_WEBP_QUALITY);
});

export const optimizeProjectAvatar = async (file: File): Promise<File> => {
  if (file.size <= AVATAR_OPTIMIZE_THRESHOLD) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, AVATAR_MAX_EDGE / longestEdge);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) return file;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const optimizedBlob = await canvasToBlob(canvas);
    if (!optimizedBlob || optimizedBlob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'project-avatar';
    return new File([optimizedBlob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const projectAvatarToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('项目头像读取失败'));
  reader.readAsDataURL(file);
});
