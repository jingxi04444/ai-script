import { useState } from 'react';
import { Plus, Edit, Trash2, Download, Upload, Search, Tag } from 'lucide-react';

export function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState('formulas');
  const [selectedBrand, setSelectedBrand] = useState('all');

  const brands = ['全部品牌', '品牌A', '品牌B', '品牌C'];

  const formulas = [
    { id: 1, name: '快消品促销标准结构', brand: '品牌A', type: '促销', platform: '抖音', usage: 23, effect: '高', updateTime: '2026-04-20' },
    { id: 2, name: '产品种草三段式', brand: '品牌A', type: '种草', platform: '小红书', usage: 45, effect: '中', updateTime: '2026-04-18' },
    { id: 3, name: '痛点-方案-效果结构', brand: '品牌B', type: '教育', platform: '抖音', usage: 67, effect: '高', updateTime: '2026-04-15' },
  ];

  const sellingPoints = [
    { id: 1, brand: '品牌A', product: '产品X', core: '超强续航48小时', tags: ['核心卖点', '技术'], updateTime: '2026-04-21', version: 'v2.1' },
    { id: 2, brand: '品牌A', product: '产品X', core: '军工级防水设计', tags: ['辅助卖点', '品质'], updateTime: '2026-04-20', version: 'v2.0' },
    { id: 3, brand: '品牌B', product: '产品Y', core: '天然有机成分', tags: ['核心卖点', '健康'], updateTime: '2026-04-19', version: 'v1.5' },
  ];

  const complianceWords = [
    { id: 1, word: '最好', type: '广告法违禁', category: '绝对化用语', suggestion: '优质/优选', status: '启用' },
    { id: 2, word: '国家级', type: '广告法违禁', category: '权威性', suggestion: '专业认证', status: '启用' },
    { id: 3, word: '医疗', type: '行业敏感词', category: '医疗行业', suggestion: '养护/呵护', status: '启用' },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('formulas')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'formulas'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
              }`}
            >
              结构公式库
            </button>
            <button
              onClick={() => setActiveTab('selling')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'selling'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
              }`}
            >
              产品卖点库
            </button>
            <button
              onClick={() => setActiveTab('compliance')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'compliance'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
              }`}
            >
              合规词库
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'tags'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
              }`}
            >
              素材标签体系
            </button>
          </div>

          {(activeTab === 'formulas' || activeTab === 'selling') && (
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {brands.map((brand, index) => (
                <option key={index} value={brand}>{brand}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {activeTab === 'formulas' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-lg">结构公式列表</h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Download className="w-4 h-4" />
                导出
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" />
                添加公式
              </button>
            </div>
          </div>

          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="搜索公式名称或场景..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部类型</option>
                <option>促销</option>
                <option>种草</option>
                <option>教育</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部平台</option>
                <option>抖音</option>
                <option>小红书</option>
                <option>视频号</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">公式名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">品牌</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">平台</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">复用次数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">效果评级</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">更新时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {formulas.map((formula) => (
                  <tr key={formula.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{formula.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{formula.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        {formula.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{formula.platform}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{formula.usage}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        formula.effect === '高' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {formula.effect}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{formula.updateTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
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

      {activeTab === 'selling' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-lg">产品卖点列表</h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Upload className="w-4 h-4" />
                批量导入
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Download className="w-4 h-4" />
                导出
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" />
                添加卖点
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">品牌</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">产品</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">核心卖点</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">标签</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">版本</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">更新时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sellingPoints.map((point) => (
                  <tr key={point.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{point.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{point.product}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{point.core}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {point.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{point.version}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{point.updateTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
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

      {activeTab === 'compliance' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-lg">合规词库管理</h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Upload className="w-4 h-4" />
                批量导入
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" />
                添加词条
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">违禁词</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">分类</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">建议替换</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {complianceWords.map((word) => (
                  <tr key={word.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">{word.word}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        {word.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{word.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{word.suggestion}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        {word.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
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

      {activeTab === 'tags' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-4">素材标签体系</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  景别类型
                </h4>
                <button className="text-blue-600 text-sm hover:underline">管理</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">特写</span>
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">中景</span>
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">全景</span>
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">航拍</span>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  情绪标签
                </h4>
                <button className="text-blue-600 text-sm hover:underline">管理</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">欢快</span>
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">温馨</span>
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">激励</span>
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">悬疑</span>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  产品展示
                </h4>
                <button className="text-blue-600 text-sm hover:underline">管理</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">静态展示</span>
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">使用场景</span>
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">对比演示</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium mb-4">标签使用统计</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">最常用标签 TOP 5</p>
                <div className="space-y-2">
                  {['特写 (234次)', '欢快 (187次)', '使用场景 (156次)', '中景 (134次)', '温馨 (98次)'].map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">品牌自定义标签</p>
                <div className="space-y-2">
                  {['品牌A: 5个', '品牌B: 3个', '品牌C: 8个'].map((item, index) => (
                    <div key={index} className="text-sm">{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
