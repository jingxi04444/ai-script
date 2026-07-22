const PREFIX = 'ai_script_';

export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const value = localStorage.getItem(PREFIX + key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(PREFIX + key);
  },

  clear: (): void => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  },
};

export const TOKEN_KEY = 'token';
