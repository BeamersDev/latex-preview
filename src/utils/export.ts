/**
 * 导出工具函数：PNG / SVG 导出与剪贴板复制
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
 * 将 HTML 元素导出为 SVG 数据 URL（使用 html-to-image）
 */
export async function exportAsSvg(element: HTMLElement): Promise<string | null> {
  try {
    const { toSvg } = await import('html-to-image');
    return await toSvg(element, {
      cacheBust: true,
    });
  } catch (err) {
    console.error('SVG export failed:', err);
    return null;
  }
}

/**
 * 从 KaTeX 渲染的 SVG 元素中提取 SVG 字符串
 * 用于复制 SVG 到剪贴板
 */
export function extractSvgString(element: HTMLElement): string | null {
  try {
    const svgEl = element.querySelector('svg');
    if (!svgEl) return null;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const width = svgEl.getAttribute('width') || '100%';
    const height = svgEl.getAttribute('height') || '100%';
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
    return new XMLSerializer().serializeToString(clone);
  } catch (err) {
    console.error('SVG extraction failed:', err);
    return null;
  }
}

/**
 * 复制 PNG 到剪贴板（使用 html-to-image toBlob）
 */
export async function copyPngToClipboard(element: HTMLElement): Promise<boolean> {
  try {
    const { toBlob } = await import('html-to-image');
    const blob = await toBlob(element, {
      quality: 1,
      pixelRatio: 2,
      cacheBust: true,
    });
    if (!blob) return false;
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch (err) {
    console.error('Copy PNG failed:', err);
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
 * 触发文件下载（Tauri: 弹保存对话框 + 写入文件）
 * Format determined from filename extension in the dialog.
 */
export async function downloadBlob(blob: Blob, filename: string, svgString?: string): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    // Step 1: Show save dialog and get the chosen path
    const path = await invoke<string>('pick_save_path', { suggested: filename });
    // Step 2: Determine format from extension
    const isSvg = path.toLowerCase().endsWith('.svg');
    let dataBase64: string;
    if (isSvg && svgString) {
      dataBase64 = btoa(unescape(encodeURIComponent(svgString)));
    } else {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      dataBase64 = dataUrl.split(',')[1];
    }
    await invoke('write_file', { path, dataBase64 });
  } catch (err) {
    // User cancelled or Tauri not available
    if (String(err).includes('cancelled') || String(err).includes(' cancelled')) return;
    console.error('Tauri save failed:', err);
    // Fallback: browser download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * 从 KaTeX 预览容器获取预览区的所有公式文本
 * 用于复制 LaTeX 源码
 */
export function extractLatexFromPreview(previewElement: HTMLElement): string {
  return previewElement.getAttribute('data-latex') ?? '';
}
