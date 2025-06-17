import React from 'react';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";

interface ReportIssueButtonProps {
  className?: string;
}

export const ReportIssueButton: React.FC<ReportIssueButtonProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  
  return (
    <Button asChild size="lg" className={`${className}`}>
      <Link href="/report">
        {t('reportIssue')}
      </Link>
    </Button>
  );
};