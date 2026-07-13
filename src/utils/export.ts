/**
 * 导出工具函数：PNG / SVG 导出
 */

/**
 * 将 HTML 元素导出为 PNG Blob
 */
export async function exportAsPng(
  element: HTMLElement,
  dpi: number = 150,
): Promise<Blob | null> {
  try {
    const { toPng } = await import('html-to-image');
    const scale = dpi / 96;
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: scale,
      cacheBust: true,
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch (err) {
    console.error('PNG export failed:', err);
    return null;
  }
}

/**
 * 从 KaTeX 渲染的 SVG 元素中提取 SVG 字符串
 */
export function exportAsSvg(element: HTMLElement): string | null {
  try {
    const svgEl = element.querySelector('svg');
    if (!svgEl) return null;
    // Create a clone to avoid modifying the original
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    // Ensure proper attributes
    const width = svgEl.getAttribute('width') || '100%';
    const height = svgEl.getAttribute('height') || '100%';
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
    return new XMLSerializer().serializeToString(clone);
  } catch (err) {
    console.error('SVG export failed:', err);
    return null;
  }
}

/**
 * 复制内容到剪贴板
 */
export async function copyToClipboard(
  content: string,
  format: 'text/plain' | 'image/png',
): Promise<boolean> {
  try {
    if (format === 'text/plain') {
      await navigator.clipboard.writeText(content);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 复制 SVG 字符串到剪贴板
 */
export async function copySvgToClipboard(
  svgString: string,
): Promise<boolean> {
  try {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/svg+xml': blob,
        'text/plain': new Blob([svgString], { type: 'text/plain' }),
      }),
    ]);
    return true;
  } catch {
    // Fallback to plain text
    return copyToClipboard(svgString, 'text/plain');
  }
}

/**
 * 触发文件下载
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 从 KaTeX 预览容器获取预览区的所有公式文本
 * 用于复制 LaTeX 源码
 */
export function extractLatexFromPreview(previewElement: HTMLElement): string {
  return previewElement.getAttribute('data-latex') ?? '';
}
