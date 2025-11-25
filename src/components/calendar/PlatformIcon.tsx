import { 
  Facebook, 
  Instagram, 
  Linkedin, 
  Youtube, 
  Twitter,
  FileText
} from 'lucide-react';

interface PlatformIconProps {
  platform: string;
  size?: number;
  className?: string;
}

const platformIcons: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  twitter: Twitter,
  x: Twitter,
  blog: FileText,
};

export function PlatformIcon({ platform, size = 16, className }: PlatformIconProps) {
  const Icon = platformIcons[platform.toLowerCase()];
  
  if (!Icon) return null;
  
  return <Icon className={className} style={{ width: size, height: size }} />;
}
