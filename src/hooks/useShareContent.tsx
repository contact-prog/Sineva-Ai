import { useState } from 'react';

interface ShareContentOptions {
  content: string;
  subject?: string;
  mediaUrls?: string[];
}

export function useShareContent() {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareContentOptions>({ content: '' });

  const openEmailModal = (options: ShareContentOptions) => {
    setShareData(options);
    setIsEmailModalOpen(true);
  };

  const openSocialModal = (options: ShareContentOptions) => {
    setShareData(options);
    setIsSocialModalOpen(true);
  };

  return {
    isEmailModalOpen,
    setIsEmailModalOpen,
    isSocialModalOpen,
    setIsSocialModalOpen,
    shareData,
    openEmailModal,
    openSocialModal
  };
}
