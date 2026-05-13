import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

const A4_W_MM = 210;
const A4_H_MM = 297;
const PAGE_MARGIN_MM = 10;

async function ensureFontsReady(): Promise<void> {
  if ("fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {}
  }
}

export async function captureNodeAsPng(node: HTMLElement): Promise<{ dataUrl: string; width: number; height: number }> {
  await ensureFontsReady();
  const dataUrl = await toPng(node, {
    backgroundColor: "#0a0a0b",
    pixelRatio: 2,
    cacheBust: true,
    style: {
      fontFamily:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
  });
  return {
    dataUrl,
    width: node.offsetWidth,
    height: node.offsetHeight,
  };
}

async function savePngBlob(blob: Blob, suggestedName: string): Promise<boolean> {
  try {
    const dialog = await import("@tauri-apps/plugin-dialog");
    const fs = await import("@tauri-apps/plugin-fs");
    const path = await dialog.save({
      defaultPath: suggestedName,
      filters: [{ name: "PNG image", extensions: ["png"] }],
    });
    if (!path) return false;
    const buf = await blob.arrayBuffer();
    await fs.writeFile(path, new Uint8Array(buf));
    return true;
  } catch {
    triggerBrowserDownload(blob, suggestedName);
    return true;
  }
}

async function savePdfBytes(bytes: Uint8Array, suggestedName: string): Promise<boolean> {
  try {
    const dialog = await import("@tauri-apps/plugin-dialog");
    const fs = await import("@tauri-apps/plugin-fs");
    const path = await dialog.save({
      defaultPath: suggestedName,
      filters: [{ name: "PDF document", extensions: ["pdf"] }],
    });
    if (!path) return false;
    await fs.writeFile(path, bytes);
    return true;
  } catch {
    const blob = new Blob([bytes], { type: "application/pdf" });
    triggerBrowserDownload(blob, suggestedName);
    return true;
  }
}

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",", 2);
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function exportNodeAsPng(node: HTMLElement, fileName: string): Promise<void> {
  const { dataUrl } = await captureNodeAsPng(node);
  const blob = dataUrlToBlob(dataUrl);
  await savePngBlob(blob, fileName);
}

export async function exportNodeAsPdf(node: HTMLElement, fileName: string): Promise<void> {
  const { dataUrl, width, height } = await captureNodeAsPng(node);
  const aspect = width / height;

  const maxW = A4_W_MM - PAGE_MARGIN_MM * 2;
  const maxH = A4_H_MM - PAGE_MARGIN_MM * 2;

  let w = maxW;
  let h = maxW / aspect;
  if (h > maxH) {
    h = maxH;
    w = maxH * aspect;
  }
  const x = (A4_W_MM - w) / 2;
  const y = (A4_H_MM - h) / 2;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFillColor(10, 10, 11);
  doc.rect(0, 0, A4_W_MM, A4_H_MM, "F");
  doc.addImage(dataUrl, "PNG", x, y, w, h, undefined, "FAST");

  const bytes = doc.output("arraybuffer");
  await savePdfBytes(new Uint8Array(bytes), fileName);
}
