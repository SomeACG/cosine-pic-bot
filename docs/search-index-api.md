# 搜索索引更新 API 接入文档

本文档描述了如何使用 SomeACG-Next 的搜索索引更新接口，用于在外部系统（如机器人）添加新图片时同步更新搜索索引。

## API 基础信息

- **Base URL**: `http://your-domain.com/api`
- **Content-Type**: `application/json`
- **所有响应格式**: JSON

## 核心接口

### 1. 搜索索引管理接口

**端点**: `POST /api/search/admin`

用于管理搜索索引的各种操作，包括单个图片索引、批量索引、重建索引等。

#### 请求格式

```typescript
{
  "action": string,  // 操作类型
  ...params          // 操作参数
}
```

#### 支持的操作类型

##### 1.1 初始化索引配置

```json
{
  "action": "initialize"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Meilisearch initialized successfully"
}
```

##### 1.2 索引所有现有图片

```json
{
  "action": "index_all",
  "batchSize": 100  // 可选，默认100
}
```

**响应**:
```json
{
  "success": true,
  "message": "All images indexed successfully"
}
```

##### 1.3 同步最近图片（推荐用于新图片添加后）

```json
{
  "action": "sync_recent",
  "hours": 24  // 可选，默认24小时
}
```

**响应**:
```json
{
  "success": true,
  "message": "Recent images synced (24 hours)"
}
```

##### 1.4 重建整个索引

```json
{
  "action": "rebuild"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Index rebuilt successfully"
}
```

##### 1.5 验证索引一致性

```json
{
  "action": "validate"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "dbCount": 12345,
    "indexCount": 12345,
    "consistent": true
  }
}
```

### 2. 获取索引状态

**端点**: `GET /api/search/admin`

获取当前搜索索引的状态报告。

**响应**:
```json
{
  "success": true,
  "data": {
    "totalImages": 12345,
    "indexedImages": 12340,
    "indexHealth": "healthy",  // "healthy" | "partial" | "empty"
    "lastSyncTime": "2024-01-15T10:30:00.000Z"
  }
}
```

## 使用场景

### 场景1: 机器人添加新图片后同步索引

当外部机器人向数据库添加新图片后，建议调用以下接口更新搜索索引：

```javascript
// 方式1：同步最近1小时的图片（推荐）
const response = await fetch('/api/search/admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'sync_recent',
    hours: 1
  })
});

const result = await response.json();
console.log(result.message);
```

### 场景2: 定期批量同步

```javascript
// 每天定期同步最近24小时的图片
const response = await fetch('/api/search/admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'sync_recent',
    hours: 24
  })
});
```

### 场景3: 首次部署或大量数据变更

```javascript
// 重建整个索引（适用于首次部署或大量数据变更）
const response = await fetch('/api/search/admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'rebuild'
  })
});
```

## 错误处理

所有接口在发生错误时返回统一格式：

```json
{
  "success": false,
  "error": "错误类型",
  "message": "详细错误信息"
}
```

常见错误码：
- `400`: 请求参数错误
- `500`: 服务器内部错误

## 实现原理

### 数据流程

1. **图片数据存储**: 图片信息存储在 PostgreSQL 数据库中
2. **索引转换**: 通过 `transformToSearchDocument` 函数将数据库记录转换为搜索文档
3. **索引存储**: 搜索文档存储在 Meilisearch 搜索引擎中
4. **标签关联**: 自动获取图片关联的标签信息并包含在搜索索引中

### 搜索文档结构

每个图片在搜索索引中包含以下字段：

```typescript
interface SearchDocument {
  id: string;           // 图片ID
  pid: string;          // 平台ID
  title?: string;       // 图片标题
  author: string;       // 作者名称
  platform: string;    // 平台名称
  tags: string[];       // 标签数组
  r18: boolean;         // 是否R18内容
  create_time: Date;    // 创建时间
  // ... 其他字段
}
```

## 性能考虑

1. **批量处理**: 大量图片索引时自动分批处理，默认每批100张
2. **内存管理**: 长时间运行的索引任务会定期释放内存
3. **增量同步**: 推荐使用 `sync_recent` 而非 `rebuild` 进行日常同步
4. **并发控制**: 索引操作会自动处理并发访问

## 监控建议

1. **定期检查索引状态**: 使用 `GET /api/search/admin` 监控索引健康度
2. **验证索引一致性**: 定期使用 `validate` 操作检查数据一致性
3. **日志监控**: 关注服务器日志中的索引操作记录

## 最佳实践

1. **新图片添加后**: 使用 `sync_recent` 操作，设置较短的时间范围（如1-2小时）
2. **定期维护**: 每天运行一次24小时的 `sync_recent` 操作
3. **大量变更后**: 仅在必要时使用 `rebuild` 操作
4. **错误重试**: 实现适当的重试机制处理临时网络错误
5. **异步处理**: 在机器人中异步调用索引更新接口，避免阻塞主流程

## 示例代码

### Python 机器人集成示例

```python
import requests
import asyncio
import logging

class SearchIndexUpdater:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        
    async def sync_recent_images(self, hours: int = 1) -> bool:
        """同步最近添加的图片到搜索索引"""
        try:
            response = requests.post(
                f"{self.base_url}/api/search/admin",
                json={
                    "action": "sync_recent",
                    "hours": hours
                },
                timeout=300  # 5分钟超时
            )
            
            if response.status_code == 200:
                result = response.json()
                logging.info(f"索引同步成功: {result.get('message', '')}")
                return True
            else:
                logging.error(f"索引同步失败: {response.status_code} {response.text}")
                return False
                
        except Exception as e:
            logging.error(f"索引同步异常: {str(e)}")
            return False
    
    async def get_index_status(self) -> dict:
        """获取索引状态"""
        try:
            response = requests.get(f"{self.base_url}/api/search/admin")
            if response.status_code == 200:
                return response.json()
            return {}
        except Exception as e:
            logging.error(f"获取索引状态失败: {str(e)}")
            return {}

# 使用示例
async def main():
    updater = SearchIndexUpdater("http://your-domain.com")
    
    # 机器人添加新图片后调用
    success = await updater.sync_recent_images(hours=1)
    
    if success:
        print("搜索索引更新成功")
    else:
        print("搜索索引更新失败")

if __name__ == "__main__":
    asyncio.run(main())
```

### Node.js 机器人集成示例

```javascript
class SearchIndexUpdater {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    
    async syncRecentImages(hours = 1) {
        try {
            const response = await fetch(`${this.baseUrl}/api/search/admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'sync_recent',
                    hours: hours
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`索引同步成功: ${result.message}`);
                return true;
            } else {
                console.error(`索引同步失败: ${result.error}`);
                return false;
            }
        } catch (error) {
            console.error(`索引同步异常: ${error.message}`);
            return false;
        }
    }
    
    async getIndexStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/api/search/admin`);
            const result = await response.json();
            return result.success ? result.data : {};
        } catch (error) {
            console.error(`获取索引状态失败: ${error.message}`);
            return {};
        }
    }
}

// 使用示例
const updater = new SearchIndexUpdater('http://your-domain.com');

// 机器人添加新图片后调用
updater.syncRecentImages(1).then(success => {
    if (success) {
        console.log('搜索索引更新成功');
    } else {
        console.log('搜索索引更新失败');
    }
});
```

## 总结

通过这些接口，外部系统可以方便地与 SomeACG-Next 的搜索索引保持同步。建议在每次添加新图片后调用 `sync_recent` 操作，并定期监控索引状态以确保搜索功能的正常运行。