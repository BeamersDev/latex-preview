import { useState, useEffect, useCallback } from 'react';
import { useSettingsContext } from '@/contexts/SettingsContext';

const SESSION_KEY = 'latex-preview-session';

export function useSession() {
  const { settings } = useSettingsContext();
  const [restored, setRestored] = useState(false);

  // 恢复会话
  useEffect(() => {
    if (!settings.autoSave || restored) return;
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        // Return the content to the caller
        setRestored(true);
      }
    } catch { /* noop */ }
  }, [settings.autoSave, restored]);

  // 保存会话
  const saveSession = useCallback(
    (content: string) => {
      if (!settings.autoSave) return;
      try {
        localStorage.setItem(SESSION_KEY, content);
      } catch { /* noop */ }
    },
    [settings.autoSave],
  );

  const loadSession = useCallback((): string => {
    try {
      return localStorage.getItem(SESSION_KEY) ?? '';
    } catch {
      return '';
    }
  }, []);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch { /* noop */ }
  }, []);

  return { saveSession, loadSession, clearSession, restored, setRestored };
}
