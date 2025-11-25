import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
];

interface TranslationContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (text: string) => string;
  isTranslating: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Cache for translations
const translationCache: Record<string, Record<string, string>> = {};

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem('app-language') || 'en';
  });
  const [isTranslating, setIsTranslating] = useState(false);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const translateTexts = async (texts: string[], targetLang: string): Promise<Record<string, string>> => {
    if (targetLang === 'en') {
      const result: Record<string, string> = {};
      texts.forEach(text => result[text] = text);
      return result;
    }

    // Check cache first
    if (translationCache[targetLang]) {
      const cached = translationCache[targetLang];
      const uncached = texts.filter(text => !cached[text]);
      
      if (uncached.length === 0) {
        return cached;
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: {
          texts,
          targetLanguage: targetLang,
          sourceLanguage: 'en'
        }
      });

      if (error) throw error;

      const result: Record<string, string> = {};
      texts.forEach((text, index) => {
        result[text] = data.translations[index] || text;
      });

      // Update cache
      if (!translationCache[targetLang]) {
        translationCache[targetLang] = {};
      }
      Object.assign(translationCache[targetLang], result);

      return result;
    } catch (error) {
      console.error('Translation error:', error);
      const result: Record<string, string> = {};
      texts.forEach(text => result[text] = text);
      return result;
    }
  };

  const t = (text: string): string => {
    if (language === 'en') return text;
    
    // Return cached translation if available
    if (translationCache[language] && translationCache[language][text]) {
      return translationCache[language][text];
    }

    // Trigger async translation in background
    if (!isTranslating) {
      setIsTranslating(true);
      translateTexts([text], language).finally(() => setIsTranslating(false));
    }

    return text; // Return original text while translating
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t, isTranslating }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
};
