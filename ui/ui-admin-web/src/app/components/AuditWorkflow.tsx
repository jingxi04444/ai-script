import { useState } from 'react';
import { Eye, CheckCircle, XCircle, Clock, AlertTriangle, User } from 'lucide-react';

export function AuditWorkflow() {
  const [activeTab, setActiveTab] = useState('pending');

  const pendingAudits = [
    { id: 1, scriptName: '春季新品促销脚本-A', brand: '品牌A', submitter: 'user-a@brand.com', submitTime: '2026-04-21 14:30', stage: '运营审核', priority: '高', warnings: 2 },
    { id: 2, scriptName: '产品功能介绍视频', brand: '品牌B', submitter: 'user-b@brand.com', submitTime: '2026-04-21 13:45', stage: '运营审核', priority: '中', warnings: 0 },
    { id: 3, scriptName: '用户痛点解决方案', brand: '品牌A', submitter: 'user-a2@brand.com', submitTime: '2026-04-21 12:20', stage: '法务审核', priority: '高', warnings: 1 },
  ];

  const auditRecords = [
    { id: 1, scriptName: '夏季清仓活动脚本', brand: '品牌A', auditor: '审核员-张三', auditTime: '2026-04-21 11:30', result: '通过', stage: '运营审核' },
    { id: 2, scriptName: '产品对比测评', brand: '品牌C', auditor: '审核员-李四', auditTime: '2026-04-21 10:15', result: '驳回', stage: '法务审核' },
    { id: 3, scriptName: '品牌故事短片', brand: '品牌B', auditor: '审核员-王五', auditTime: '2026-04-21 09:45', result: '通过', stage: '经理审核' },
  ];

  const auditors = [
    { id: 1, name: '张三', role: '运营审核员', brand: '品牌A', pending: 5, completed: 123, avgTime: '1.5h' },
    { id: 2, name: '李四', role: '法务审核员', brand: '全部', pending: 3, completed: 89, avgTime: '2.3h' },
    { id: 3, name: '王五', role: '经理', brand: '品牌B', pending: 2, completed: 67, avgTime: '0.8h' },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            待审核任务
            <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
              {pendingAudits.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'records'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            审核记录
          </button>
          <button
            onClick={() => setActiveTab('auditors')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'auditors'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            审核员管理
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            审核规则配置
          </button>
        </div>
      </div>

      {activeTab === 'pending' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-lg mb-4">待审核列表</h3>
            <div className="flex gap-4">
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部品牌</option>
                <option>品牌A</option>
                <option>品牌B</option>
                <option>品牌C</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部审核阶段</option>
                <option>运营审核</option>
                <option>法务审核</option>
                <option>经理审核</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部优先级</option>
                <option>高</option>
                <option>中</option>
                <option>低</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">脚本名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">品牌</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">提交人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">提交时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">审核阶段</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">优先级</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">警告</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {pendingAudits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{audit.scriptName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{audit.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{audit.submitter}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{audit.submitTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {audit.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        audit.priority === '高' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {audit.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {audit.warnings > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span className="text-sm text-orange-600">{audit.warnings}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                          <Eye className="w-3 h-3" />
                          查看
                        </button>
                        <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          分配
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

      {activeTab === 'records' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-lg mb-4">审核记录</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="搜索脚本名称..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>全部结果</option>
                <option>通过</option>
                <option>驳回</option>
              </select>
              <input
                type="date"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">脚本名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">品牌</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">审核人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">审核时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">审核阶段</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">结果</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {auditRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.scriptName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{record.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{record.auditor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{record.auditTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:text-gray-100">
                        {record.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {record.result === '通过' ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-700">通过</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-700">驳回</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Eye className="w-3 h-3" />
                        详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'auditors' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-lg">审核员列表</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <User className="w-4 h-4" />
              添加审核员
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">姓名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">角色</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">负责品牌</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">待审核</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">已完成</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">平均耗时</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {auditors.map((auditor) => (
                  <tr key={auditor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{auditor.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        {auditor.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{auditor.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-orange-600">{auditor.pending}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{auditor.completed}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{auditor.avgTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-blue-600 hover:underline mr-3">编辑</button>
                      <button className="text-red-600 hover:underline">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="font-semibold text-lg mb-4">审核流程配置</h3>

            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">品牌A - 审核流程</h4>
                  <button className="text-blue-600 text-sm hover:underline">编辑</button>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">运营审核</span>
                  <span className="text-gray-400 dark:text-gray-500">→</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">法务审核</span>
                  <span className="text-gray-400 dark:text-gray-500">→</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">经理审核</span>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">品牌B - 审核流程</h4>
                  <button className="text-blue-600 text-sm hover:underline">编辑</button>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">运营审核</span>
                  <span className="text-gray-400 dark:text-gray-500">→</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">法务审核</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="font-semibold text-lg mb-4">合规检查规则</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <p className="font-medium text-sm">违禁词高亮</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">自动标记广告法违禁词</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <p className="font-medium text-sm">原创度检测</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">检测脚本与已有内容的相似度</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <p className="font-medium text-sm">敏感词检测</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">检测行业敏感词汇</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="pt-3">
                <label className="block text-sm font-medium mb-2">原创度阈值</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="80"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                  <span>0%</span>
                  <span className="font-medium text-blue-600">80%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
