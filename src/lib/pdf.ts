import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';

/**
 * Build an A4 PDF from a list of local image URIs (one per page).
 * Returns the local file URI of the resulting PDF.
 */
export async function buildPdfFromImages(uris: string[], baseName: string): Promise<{
  uri: string;
  fileName: string;
  size: number;
}> {
  if (uris.length === 0) throw new Error('Aucune page à exporter');

  const dataUris = await Promise.all(
    uris.map(async (uri) => {
      const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${b64}`;
    })
  );

  const pages = dataUris
    .map(
      (src) => `
        <section>
          <img src="${src}" />
        </section>`
    )
    .join('\n');

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 0; }
          html, body { margin: 0; padding: 0; }
          section {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            background: #fff;
          }
          section:last-child { page-break-after: auto; }
          img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>${pages}</body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const safeBase = baseName.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 60) || 'document';
  const fileName = `${safeBase}_${Date.now()}.pdf`;
  const target = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.moveAsync({ from: uri, to: target });

  const info = await FileSystem.getInfoAsync(target);
  return {
    uri: target,
    fileName,
    size: info.exists && 'size' in info ? (info.size as number) : 0,
  };
}
