import { Platform } from '@/constants/enum';

export const genArtistUrl = (platform?: string | null, artist?: { uid?: string; username?: string }) => {
  if (!platform || !artist) return '';
  switch (platform) {
    case Platform.Pixiv:
      return 'https://www.pixiv.net/users/' + artist.uid;
    case Platform.Twitter:
      return 'https://x.com/i/user/' + artist.uid;
  }
  return '';
};

export const genArtworkUrl = (opts?: { platform?: string | null; pid?: string; username?: string }) => {
  const { platform, pid } = opts ?? {};
  if (!platform) return '';
  switch (platform) {
    case Platform.Pixiv:
      return 'https://www.pixiv.net/artworks/' + pid;
    case Platform.Twitter:
      return 'https://x.com/_/status/' + pid;
  }
  return '';
};
