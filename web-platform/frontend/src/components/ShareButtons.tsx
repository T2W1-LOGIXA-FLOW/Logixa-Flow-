'use client';

import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface ShareButtonsProps {
  title: string;
  url: string;
  description?: string;
}

export default function ShareButtons({ title, url }: ShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const socialLinks = [
    {
      name: 'Facebook',
      icon: '👍',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:text-blue-500',
    },
    {
      name: 'Twitter',
      icon: '𝕏',
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'hover:text-slate-400',
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'hover:text-blue-600',
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const handleShare = (socialUrl: string, name: string) => {
    window.open(socialUrl, '_blank', 'width=600,height=400');
    toast.success(`Sharing to ${name}...`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      className="logixa-card border border-slate-700 rounded-lg p-6 mt-8"
    >
      <h3 className="text-lg font-semibold mb-4">Share This Article</h3>
      <div className="flex items-center gap-3 flex-wrap">
        {socialLinks.map(social => (
          <motion.button
            key={social.name}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleShare(social.url, social.name)}
            className={`w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center transition ${social.color}`}
            title={`Share on ${social.name}`}
          >
            {social.icon}
          </motion.button>
        ))}

        <div className="w-px h-6 bg-slate-700" />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopyLink}
          className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition text-sm font-medium"
        >
          📋 Copy Link
        </motion.button>
      </div>
    </motion.div>
  );
}
