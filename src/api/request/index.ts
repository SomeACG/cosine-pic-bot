import axios from 'axios';

export const commonHeaders = {
  'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
};

const request = axios.create({
  headers: commonHeaders,
});

export default request;
