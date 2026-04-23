import { TrendingUp, Users, FileText, CheckCircle } from 'lucide-react';

export function Dashboard() {
  const stats = [
    { label: '品牌租户总数', value: '12', icon: Users, color: 'bg-blue-500' },
    { label: '脚本生成总数', value: '1,234', icon: FileText, color: 'bg-green-500' },
    { label: '待审核脚本', value: '23', icon: CheckCircle, color: 'bg-yellow-500' },
    { label: '今日API调用', value: '5,678', icon: TrendingUp, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 dark:text-gray-300 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 dark:text-gray-100">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-4">最近活动</h3>
          <div className="space-y-4">
            {[
              { brand: '品牌A', action: '提交了新脚本审核', time: '5分钟前' },
              { brand: '品牌B', action: '完成脚本生成', time: '15分钟前' },
              { brand: '品牌C', action: '导入了新的卖点数据', time: '1小时前' },
              { brand: '系统', action: 'API配置已更新', time: '2小时前' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 dark:border-gray-700 last:border-0">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100 dark:text-gray-100">{activity.brand}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">{activity.action}</p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-4">系统状态</h3>
          <div className="space-y-4">
            {[
              { service: 'AI生成服务', status: '正常', color: 'bg-green-500' },
              { service: '视频解析API', status: '正常', color: 'bg-green-500' },
              { service: '数据库', status: '正常', color: 'bg-green-500' },
              { service: '存储服务', status: '警告 (78%)', color: 'bg-yellow-500' },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-200 dark:text-gray-200">{item.service}</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 ${item.color} rounded-full`}></span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
