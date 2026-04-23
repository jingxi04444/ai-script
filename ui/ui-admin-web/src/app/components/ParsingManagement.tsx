import { useState } from 'react';
import { Plus, Edit, Trash2, TestTube, CheckCircle, AlertCircle } from 'lucide-react';

export function ParsingManagement() {
  const [activeTab, setActiveTab] = useState('api');

  const apiConfigs = [
    { id: 1, name: '抖音解析API-主', provider: '服务商A', status: '正常', priority: '主API', calls: 1234 },
    { id: 2, name: '抖音解析API-备', provider: '服务商B', status: '正常', priority: '备用', calls: 45 },
    { id: 3, name: '小红书解析API', provider: '服务商A', status: '异常', priority: '主API', calls: 0 },
  ];

  const parseLogs = [
    { id: 1, time: '2026-04-21 14:30:15', brand: '品牌A', user: 'user@brand-a.com', url: 'https://douyin.com/video/123...', status: '成功', api: '抖音解析API-主', duration: '1.2s' },
    { id: 2, time: '2026-04-21 14:28:43', brand: '品牌B', user: 'user@brand-b.com', url: 'https://xiaohongshu.com/123...', status: '失败', api: '小红书解析API', duration: '5.0s' },
    { id: 3, time: '2026-04-21 14:25:11', brand: '品牌A', user: 'user@brand-a.com', url: 'https://douyin.com/video/456...', status: '成功', api: '抖音解析API-主', duration: '0.9s' },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('api')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'api'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            API 配置管理
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            解析日志
          </button>
          <button
            onClick={() => setActiveTab('plugin')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'plugin'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            浏览器插件
          </button>
        </div>
      </div>

      {activeTab === 'api' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-lg">API 配置列表</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              添加 API 配置
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">API名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">服务商</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">优先级</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">调用次数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {apiConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{config.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{config.provider}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        config.priority === '主API' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800 dark:text-gray-100'
                      }`}>
                        {config.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {config.status === '正常' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm ${config.status === '正常' ? 'text-green-700' : 'text-red-700'}`}>
                          {config.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{config.calls.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="测试连接">
                          <TestTube className="w-4 h-4 text-blue-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="编辑">
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="删除">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-lg mb-4">解析日志</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="搜索链接或品牌..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部状态</option>
                <option>成功</option>
                <option>失败</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部品牌</option>
                <option>品牌A</option>
                <option>品牌B</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">品牌</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">用户</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">链接</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">使用API</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">耗时</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">状态</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {parseLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{log.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{log.user}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 max-w-xs truncate">{log.url}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{log.api}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{log.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        log.status === '成功' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">显示 1-3 共 234 条记录</p>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">上一页</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">2</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">3</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">下一页</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plugin' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-4">浏览器插件管理</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h4 className="font-medium mb-4">插件版本管理</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">当前版本:</span>
                  <span className="font-medium">v1.2.3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">发布日期:</span>
                  <span className="text-sm">2026-04-15</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">安装数:</span>
                  <span className="text-sm">45</span>
                </div>
              </div>
              <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                发布新版本
              </button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h4 className="font-medium mb-4">授权管理</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">已授权品牌: 8 / 12</p>
              <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                管理授权名单
              </button>
              <button className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                下载插件安装包
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
