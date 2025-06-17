import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

interface PolishLabelsProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAdd: () => void;
}

/**
 * This component ensures proper translations for the location form fields
 */
export default function PolishLabels({ value, onChange, onAdd }: PolishLabelsProps) {
  const { t, i18n } = useTranslation();
  
  // Get proper translations based on current language
  const getLabel = (key: string, englishDefault: string, polishDefault: string, spanishDefault: string) => {
    const translation = t(key);
    if (translation === key) {
      // If translation key is returned as-is, use language-specific defaults
      if (i18n.language === 'pl') return polishDefault;
      if (i18n.language === 'es') return spanishDefault;
      return englishDefault;
    }
    return translation;
  };
  
  return (
    <div className="space-y-2 border-t pt-3 mt-3">
      <Label>
        {getLabel('locations.newLocationName', 'New Location Name', 'Nazwa Nowej Lokalizacji', 'Nombre de Nueva Ubicación')}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={onChange}
          placeholder={getLabel('locations.enterName', 'Enter name', 'Wprowadź nazwę', 'Ingrese nombre')}
        />
        <Button 
          type="button"
          onClick={onAdd}
        >
          {getLabel('locations.add', 'Add', 'Dodaj', 'Agregar')}
        </Button>
      </div>
    </div>
  );
}