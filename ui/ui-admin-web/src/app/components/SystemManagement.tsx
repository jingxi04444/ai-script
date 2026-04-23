import { useState } from 'react';
import { Plus, Edit, Trash2, Shield, Key, Users, Building2 } from 'lucide-react';

export function SystemManagement() {
  const [activeTab, setActiveTab] = useState('brands');

  const brands = [
    { id: 1, name: '品牌A', contact: '张经理', phone: '13800138001', status: '正常', expiry: '2027-04-21', storage: '45GB/100GB' },
    { id: 2, name: '品牌B', contact: '李经理', phone: '13800138002', status: '正常', expiry: '2026-12-31', storage: '23GB/50GB' },
    { id: 3, name: '品牌C', contact: '王经理', phone: '13800138003', status: '即将到期', expiry: '2026-05-15', storage: '78GB/100GB' },
  ];

  const users = [
    { id: 1, name: '张三', email: 'zhang@brand-a.com', role: '品牌管理员', brand: '品牌A', status: '正常', lastLogin: '2026-04-21 14:30' },
    { id: 2, name: '李四', email: 'li@system.com', role: '系统管理员', brand: '全部', status: '正常', lastLogin: '2026-04-21 13:15' },
    { id: 3, name: '王五', email: 'wang@brand-b.com', role: '审核员', brand: '品牌B', status: '正常', lastLogin: '2026-04-20 16:45' },
  ];

  const apiConfigs = [
    { id: 1, name: 'ChatGPT API', type: '文生文', provider: 'OpenAI', status: '正常', calls: 12345, quota: '100K' },
    { id: 2, name: 'DALL-E API', type: '文生图', provider: 'OpenAI', status: '正常', calls: 3456, quota: '50K' },
    { id: 3, name: 'Azure TTS', type: 'TTS', provider: 'Microsoft', status: '异常', calls: 0, quota: '200K' },
  ];

  const operationLogs = [
    { id: 1, user: 'admin@system.com', action: '修改API配置', target: 'ChatGPT API', ip: '192.168.1.100', time: '2026-04-21 14:35:23' },
    { id: 2, user: 'zhang@brand-a.com', action: '创建审核任务', target: '春季促销脚本', ip: '192.168.1.101', time: '2026-04-21 14:20:15' },
    { id: 3, user: 'admin@system.com', action: '添加品牌租户', target: '品牌D', ip: '192.168.1.100', time: '2026-04-21 13:50:42' },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('brands')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'brands'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            品牌租户管理
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            用户与权限
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'api'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            API管理
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100'
            }`}
          >
            操作日志
          </button>
        </div>
      </div>

      {activeTab === 'brands' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-lg">品牌租户列表</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              添加品牌租户
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">品牌名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">联系人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">联系方式</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">到期时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">存储占用</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {brands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      {brand.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{brand.contact}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{brand.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        brand.status === '正常' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {brand.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{brand.expiry}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{brand.storage}</td>
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

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-lg">用户账号列表</h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Shield className="w-4 h-4" />
                角色权限配置
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" />
                添加用户
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">姓名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">邮箱</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">角色</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">所属品牌</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">最后登录</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.role === '系统管理员' ? 'bg-red-100 text-red-800' :
                        user.role === '品牌管理员' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800 dark:text-gray-100'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{user.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{user.lastLogin}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:underline">编辑</button>
                        <button className="text-gray-600 dark:text-gray-300 hover:underline">重置密码</button>
                        <button className="text-red-600 hover:underline">禁用</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium mb-4">预设角色权限</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: '系统超级管理员', desc: '拥有所有权限,可管理所有品牌和系统配置' },
                { name: '品牌专属管理员', desc: '仅可管理本品牌的知识库、项目、素材' },
                { name: '审核员', desc: '仅可执行审核操作,查看审核任务' },
              ].map((role, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-sm">{role.name}</h5>
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{role.desc}</p>
                  <button className="mt-3 text-sm text-blue-600 hover:underline">配置权限</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-lg">外部API配置</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              添加API
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">API名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">服务商</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">调用次数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">配额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {apiConfigs.map((api) => (
                  <tr key={api.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      {api.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        {api.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{api.provider}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        api.status === '正常' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {api.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{api.calls.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{api.quota}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:underline">编辑</button>
                        <button className="text-gray-600 dark:text-gray-300 hover:underline">监控</button>
                        <button className="text-red-600 hover:underline">删除</button>
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
            <h3 className="font-semibold text-lg mb-4">操作日志</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="搜索用户或操作..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作内容</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">操作对象</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">IP地址</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {operationLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{log.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.user}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{log.action}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{log.target}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">显示 1-3 共 1,234 条记录</p>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">上一页</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">2</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">下一页</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
