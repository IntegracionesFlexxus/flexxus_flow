import { useState, useEffect, useCallback } from 'react';

// Hook para manejar localStorage de forma reactiva - MVP simple
// TODO: En Nivel 2 agregar encriptación para datos sensibles

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  }
) {
  // Funciones de serialización personalizables
  const serialize = options?.serialize || JSON.stringify;
  const deserialize = options?.deserialize || JSON.parse;

  // Estado con lazy initialization
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Setter que actualiza state y localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Permitir valores funcionales como setState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Guardar en state
      setStoredValue(valueToStore);
      
      // Guardar en localStorage
      window.localStorage.setItem(key, serialize(valueToStore));
      
      // Disparar evento custom para sincronizar entre tabs
      window.dispatchEvent(new CustomEvent('local-storage', {
        detail: { key, value: valueToStore }
      }));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, serialize, storedValue]);

  // Remover item del localStorage
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
      
      // Disparar evento custom
      window.dispatchEvent(new CustomEvent('local-storage', {
        detail: { key, value: null }
      }));
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Sincronizar con cambios en localStorage (otras tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(deserialize(e.newValue));
        } catch (error) {
          console.error(`Error syncing localStorage key "${key}":`, error);
        }
      }
    };

    // Listener para eventos nativos de storage
    window.addEventListener('storage', handleStorageChange);

    // Listener para eventos custom (misma tab)
    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.value);
      }
    };
    window.addEventListener('local-storage' as any, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage' as any, handleCustomEvent);
    };
  }, [key, deserialize]);

  return [storedValue, setValue, removeValue] as const;
}

// Hook helper para preferencias del usuario
export function useUserPreferences() {
  const [preferences, setPreferences] = useLocalStorage('user_preferences', {
    theme: 'light',
    language: 'es',
    notifications: true,
    compactView: false,
    sidebarCollapsed: false
  });

  const updatePreference = useCallback((key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, [setPreferences]);

  return { preferences, updatePreference };
}

// Hook helper para guardar drafts de formularios
export function useFormDraft<T extends Record<string, any>>(formId: string) {
  const [draft, setDraft, removeDraft] = useLocalStorage<T | null>(
    `form_draft_${formId}`,
    null
  );

  const saveDraft = useCallback((data: T) => {
    setDraft({ ...data, savedAt: Date.now() });
  }, [setDraft]);

  const clearDraft = useCallback(() => {
    removeDraft();
  }, [removeDraft]);

  const hasDraft = draft !== null;
  const draftAge = draft ? Date.now() - (draft.savedAt || 0) : 0;

  return {
    draft,
    saveDraft,
    clearDraft,
    hasDraft,
    draftAge
  };
}

export default useLocalStorage;