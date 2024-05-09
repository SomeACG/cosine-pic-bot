import { PIXIV_COOKIE } from '@/constants';
import { PixivAjaxResp } from '@/types/pixiv';
import axios, { AxiosResponse } from 'axios';
import { commonHeaders } from '.';

const pixivRequest = axios.create({
  headers: {
    cookie: PIXIV_COOKIE,
    ...commonHeaders,
  },
});

pixivRequest.interceptors.response.use((response: AxiosResponse<PixivAjaxResp<unknown>>) => {
  if (response.status != 200) {
    if (response.data.error && response.data.message) {
      throw new Error(response.data.message);
    } else {
      throw new Error(`pixiv ajax request failed with status code ${response.status}`);
    }
  }
  return response;
});

export default pixivRequest;
