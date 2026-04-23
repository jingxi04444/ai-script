import { useState } from 'react';
import { Download, Trash2, Eye, Filter, FolderOpen, Video, Image as ImageIcon } from 'lucide-react';

export function MaterialsManagement() {
  const [activeTab, setActiveTab] = useState('projects');

  const projects = [
    { id: 1, name: '春季新品促销脚本-A', brand: '品牌A', creator: 'user-a@brand.com', status: '已完成', materials: 12, createTime: '2026-04-20', product: '产品X' },
    { id: 2, name: '产品功能介绍视频', brand: '品牌B', creator: 'user-b@brand.com', status: '生成中', materials: 0, createTime: '2026-04-21', product: '产品Y' },
    { id: 3, name: '用户痛点解决方案', brand: '品牌A', creator: 'user-a2@brand.com', status: '审核中', materials: 8, createTime: '2026-04-19', product: '产品X' },
  ];

  const materials = [
    { id: 1, name: '产品特写-01.mp4', brand: '品牌A', type: '视频', size: '12.3 MB', project: '春季新品促销脚本-A', usage: 3, tags: ['特写', '产品'], uploadTime: '2026-04-20' },
    { id: 2, name: '背景音乐-轻快.mp3', brand: '品牌A', type: '音频', size: '3.5 MB', project: '春季新品促销脚本-A', usage: 5, tags: ['欢快', '背景'], uploadTime: '2026-04-20' },
    { id: 3, name: '场景图-办公室.jpg', brand: '品牌B', type: '图片', size: '2.1 MB', project: '产品功能介绍视频', usage: 2, tags: ['场景', '办公'], uploadTime: '2026-04-21' },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'projects'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            项目管理
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'materials'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            素材库
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'storage'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            存储统计
          </button>
        </div>
      </div>

      {activeTab === 'projects' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-lg mb-4">项目列表</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="搜索项目名称..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部品牌</option>
                <option>品牌A</option>
                <option>品牌B</option>
                <option>品牌C</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部状态</option>
                <option>草稿</option>
                <option>审核中</option>
                <option>生成中</option>
                <option>已完成</option>
                <option>已归档</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">项目名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">品牌</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">关联产品</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">创建人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">素材数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">创建时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-blue-500" />
                      {project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{project.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{project.product}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{project.creator}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        project.status === '已完成' ? 'bg-green-100 text-green-800' :
                        project.status === '生成中' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{project.materials}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{project.createTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="查看">
                          <Eye className="w-4 h-4 text-gray-600 dark:text-gray-300" />
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

      {activeTab === 'materials' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-lg mb-4">素材库</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="搜索素材名称或标签..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部品牌</option>
                <option>品牌A</option>
                <option>品牌B</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部类型</option>
                <option>视频</option>
                <option>图片</option>
                <option>音频</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Filter className="w-4 h-4" />
                更多筛选
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">素材名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">品牌</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">大小</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">关联项目</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">复用次数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">标签</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {materials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                      {material.type === '视频' && <Video className="w-4 h-4 text-purple-500" />}
                      {material.type === '图片' && <ImageIcon className="w-4 h-4 text-green-500" />}
                      {material.type === '音频' && <span className="w-4 h-4 text-blue-500">🎵</span>}
                      {material.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{material.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        material.type === '视频' ? 'bg-purple-100 text-purple-800' :
                        material.type === '图片' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {material.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{material.size}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 max-w-xs truncate">{material.project}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{material.usage}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {material.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 dark:text-gray-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="预览">
                          <Eye className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="下载">
                          <Download className="w-4 h-4 text-blue-600" />
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

      {activeTab === 'storage' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[
              { brand: '品牌A', used: 45, total: 100, unit: 'GB' },
              { brand: '品牌B', used: 23, total: 50, unit: 'GB' },
              { brand: '品牌C', used: 78, total: 100, unit: 'GB' },
            ].map((storage, index) => {
              const percentage = (storage.used / storage.total) * 100;
              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h4 className="font-medium mb-4">{storage.brand}</h4>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-300">存储使用</span>
                      <span className="font-medium">{storage.used} / {storage.total} {storage.unit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          percentage > 80 ? 'bg-red-500' :
                          percentage > 60 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">视频:</span>
                      <span>{(storage.used * 0.6).toFixed(1)} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">图片:</span>
                      <span>{(storage.used * 0.3).toFixed(1)} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">音频:</span>
                      <span>{(storage.used * 0.1).toFixed(1)} GB</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="font-semibold text-lg mb-4">素材复用统计</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">高复用素材 TOP 10</h4>
                <div className="space-y-2">
                  {[
                    { name: '产品特写-01.mp4', brand: '品牌A', usage: 15 },
                    { name: '背景音乐-轻快.mp3', brand: '品牌A', usage: 12 },
                    { name: '场景图-办公室.jpg', brand: '品牌B', usage: 10 },
                    { name: 'Logo动画.mp4', brand: '品牌C', usage: 8 },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.brand}</p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {item.usage}次
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">低质量素材 (建议清理)</h4>
                <div className="space-y-2">
                  {[
                    { name: '测试视频-draft.mp4', brand: '品牌A', size: '45 MB', usage: 0 },
                    { name: '备份-old.jpg', brand: '品牌B', size: '12 MB', usage: 0 },
                    { name: 'temp-audio.mp3', brand: '品牌A', size: '8 MB', usage: 1 },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.brand} · {item.size}</p>
                      </div>
                      <button className="text-xs text-red-600 hover:underline">删除</button>
                    </div>
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
