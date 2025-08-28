import logger from './logger';

interface SearchIndexConfig {
  baseUrl?: string;
  timeout?: number;
}

interface SearchIndexResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

class SearchIndexUpdater {
  private baseUrl: string;
  private timeout: number;

  constructor(config: SearchIndexConfig = {}) {
    // 从环境变量获取搜索API的基础URL
    this.baseUrl = config.baseUrl || process.env.SEARCH_API_BASE_URL || '';
    this.timeout = config.timeout || 30000; // 30秒超时

    if (!this.baseUrl) {
      logger.warn('搜索索引API URL未配置，搜索索引更新功能将不可用');
    }
  }

  /**
   * 检查搜索索引API是否可用
   */
  public isEnabled(): boolean {
    return !!this.baseUrl;
  }

  /**
   * 同步最近添加的图片到搜索索引
   * @param hours 同步最近多少小时的图片，默认1小时
   */
  async syncRecentImages(hours: number = 1): Promise<boolean> {
    if (!this.isEnabled()) {
      logger.warn('搜索索引API未配置，跳过索引更新');
      return false;
    }

    try {
      logger.info(`开始同步最近 ${hours} 小时的图片到搜索索引`);

      const response = await fetch(`${this.baseUrl}/api/search/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_recent',
          hours: hours,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      const result = (await response.json()) as SearchIndexResponse;

      if (result.success) {
        logger.info(`搜索索引更新成功: ${result.message}`);
        return true;
      } else {
        logger.error(`搜索索引更新失败: ${result.error || result.message || '未知错误'}`);
        return false;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error(`搜索索引更新超时 (${this.timeout}ms)`);
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        logger.error(`搜索索引API连接失败: ${error.message}`);
      } else {
        logger.error(`搜索索引更新异常: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * 获取搜索索引状态
   */
  async getIndexStatus(): Promise<any> {
    if (!this.isEnabled()) {
      logger.warn('搜索索引API未配置');
      return null;
    }

    try {
      logger.info('获取搜索索引状态');

      const response = await fetch(`${this.baseUrl}/api/search/admin`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout),
      });

      const result = (await response.json()) as SearchIndexResponse;

      if (result.success) {
        logger.info('成功获取搜索索引状态');
        return result.data;
      } else {
        logger.error(`获取搜索索引状态失败: ${result.error || result.message || '未知错误'}`);
        return null;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error(`获取搜索索引状态超时 (${this.timeout}ms)`);
      } else {
        logger.error(`获取搜索索引状态异常: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * 执行完整的索引重建（谨慎使用）
   */
  async rebuildIndex(): Promise<boolean> {
    if (!this.isEnabled()) {
      logger.warn('搜索索引API未配置，跳过索引重建');
      return false;
    }

    try {
      logger.warn('开始重建搜索索引（这可能需要很长时间）');

      const response = await fetch(`${this.baseUrl}/api/search/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rebuild',
        }),
        signal: AbortSignal.timeout(300000), // 5分钟超时
      });

      const result = (await response.json()) as SearchIndexResponse;

      if (result.success) {
        logger.info(`搜索索引重建成功: ${result.message}`);
        return true;
      } else {
        logger.error(`搜索索引重建失败: ${result.error || result.message || '未知错误'}`);
        return false;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error('搜索索引重建超时');
      } else {
        logger.error(`搜索索引重建异常: ${error.message}`);
      }
      return false;
    }
  }
}

// 创建全局实例
export const searchIndexUpdater = new SearchIndexUpdater();

// 导出类以供需要自定义配置时使用
export { SearchIndexUpdater };
