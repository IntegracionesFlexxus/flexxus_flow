// useQuoteExport - Sprint 19 Frontend Implementation
// Export quotes to various formats

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { quoteService } from '../services/quoteService';

interface UseQuoteExportReturn {
  generatePDF: (quoteId: number, templateId?: number) => Promise<void>;
  sendEmail: (quoteId: number, emailData: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    message: string;
    includeAttachments?: boolean;
    templateId?: number;
  }) => Promise<void>;
  isGenerating: boolean;
  isSending: boolean;
}

export const useQuoteExport = (): UseQuoteExportReturn => {
  const generatePDFMutation = useMutation({
    mutationFn: ({ quoteId, templateId }: { quoteId: number; templateId?: number }) =>
      quoteService.generateDocument(quoteId, {
        quoteId,
        templateId: templateId || 1, // Default template
        format: 'pdf'
      })
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ quoteId, emailData }: {
      quoteId: number;
      emailData: {
        to: string[];
        cc?: string[];
        bcc?: string[];
        subject: string;
        message: string;
        includeAttachments?: boolean;
        templateId?: number;
      }
    }) => quoteService.sendQuoteEmail(quoteId, emailData)
  });

  const generatePDF = useCallback(async (quoteId: number, templateId?: number) => {
    await generatePDFMutation.mutateAsync({ quoteId, templateId });
  }, [generatePDFMutation]);

  const sendEmail = useCallback(async (quoteId: number, emailData: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    message: string;
    includeAttachments?: boolean;
    templateId?: number;
  }) => {
    await sendEmailMutation.mutateAsync({ quoteId, emailData });
  }, [sendEmailMutation]);

  return {
    generatePDF,
    sendEmail,
    isGenerating: generatePDFMutation.isPending,
    isSending: sendEmailMutation.isPending
  };
};