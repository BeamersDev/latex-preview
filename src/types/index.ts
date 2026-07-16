export interface Theme {
  name: string;
  label: string;
  type: 'light' | 'dark';
}

export interface Settings {
  layout: 'horizontal' | 'vertical';
  dpi: number;
  autoSave: boolean;
  zoomLevel: number;
  markdownMode: boolean;
  markdownScale: number;
  exportFileName: string;
}

export interface SymbolCategory {
  id: string;
  label: string;
  symbols: SymbolItem[];
}

export interface SymbolItem {
  latex: string;
  label: string;
  description?: string;
}

export interface ExportOptions {
  format: 'png' | 'svg';
  dpi: number;
  backgroundColor?: string;
}

export interface EditorPosition {
  line: number;
  col: number;
}
