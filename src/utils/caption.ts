import { Platform } from '@/constants/enum';
import { Artist, ArtworkInfo } from '@/types/Artwork';

function encodeHtmlChars(text: string) {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function genArtistUrl(artist: Artist) {
  switch (artist.type) {
    case Platform.Pixiv:
      return 'https://www.pixiv.net/users/' + artist.uid;
    case Platform.Twitter:
      return 'https://twitter.com/' + artist.username;
  }
}

export function infoCmdCaption(artwork_info: ArtworkInfo) {
  let caption = '图片下载成功!\n';
  if (artwork_info.title) caption += `<b>作品标题:</b> ${encodeHtmlChars(artwork_info.title)}\n`;
  if (artwork_info.desc) caption += `<b>作品描述:</b> <code>${artwork_info.desc}</code>\n`;
  if (artwork_info.artist) {
    caption += `<b>画师主页:</b> `;
    caption += `<a href="${genArtistUrl(artwork_info.artist)}">${artwork_info.artist.name}</a>\n`;
  }
  if (artwork_info.raw_tags && artwork_info.raw_tags.length > 0) {
    caption += '<b>原始标签:</b> ';
    caption += artwork_info.raw_tags.map((str) => `#${str}`).join(' ');
    caption += '\n';
  }
  caption += `<b>尺寸:</b> ${artwork_info.size.width}x${artwork_info.size.height}`;

  return caption;
}
