export const getMediaUrl = (url, baseUrl) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};
