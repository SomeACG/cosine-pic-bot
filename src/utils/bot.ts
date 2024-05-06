export function getLinkableFileList(fileKeyList: string[]) {
  // 构建带超链接的文件列表
  const baseLink = 'https://backblaze.cosine.ren/'; // 超链接前缀
  const fileList = fileKeyList
    .map((key) => {
      const fileLink = baseLink + key; // 构建完整的文件URL
      return `<a href="${fileLink}">${key}</a>`; // 使用HTML格式的超链接
    })
    .join('\n');
  return fileList;
}
