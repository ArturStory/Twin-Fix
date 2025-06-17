import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "react-i18next";
import i18n from '@/i18n';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t('common.toggleTheme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          {i18n.language === 'en' ? 'Light' : 
           i18n.language === 'es' ? 'Claro' : 
           i18n.language === 'pl' ? 'Jasny' : 'Light'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          {i18n.language === 'en' ? 'Dark' : 
           i18n.language === 'es' ? 'Oscuro' : 
           i18n.language === 'pl' ? 'Ciemny' : 'Dark'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          {i18n.language === 'en' ? 'System' : 
           i18n.language === 'es' ? 'Sistema' : 
           i18n.language === 'pl' ? 'System' : 'System'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}