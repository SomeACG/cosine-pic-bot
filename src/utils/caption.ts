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
  const { title, desc, artist, raw_tags, post_url, custom_tags } = artwork_info;
  let caption = '';
  if (title) caption += `<b>${encodeHtmlChars(title)}</b>\n`;
  if (desc) caption += `<blockquote>${encodeHtmlChars(desc)}</blockquote>\n`;
  if (artist) {
    caption += `<a href="${post_url}">Source</a> by <a href="${genArtistUrl(artwork_info.artist)}">${
      artwork_info.artist.name
    }</a>\n`;
  }
  if (raw_tags?.length) {
    caption += '<b>原始标签:</b> ';
    caption += raw_tags.map((str) => `#${str}`).join(' ');
    caption += '\n';
  }
  if (custom_tags?.length) {
    caption += '<b>自定义标签:</b> ';
    caption += custom_tags.join(' ');
    caption += '\n';
  }
  caption += `<b>尺寸:</b> ${artwork_info.size.width}x${artwork_info.size.height}`;

  return caption;
}
