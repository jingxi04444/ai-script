import { TrendingUp, Eye, Heart, Share2, ShoppingCart } from 'lucide-react';

export function Analytics() {
  return (
    <div className="p-8">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">功能提示</h3>
        <p className="text-blue-700 text-sm">
          投放数据看板功能为高阶功能,MVP版本暂未实现。此模块将展示脚本投放效果、趋势分析、A/B测试报告等数据。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: '总播放量', value: '1.2M', icon: Eye, color: 'bg-blue-500', change: '+12.5%' },
          { label: '总互动率', value: '8.3%', icon: Heart, color: 'bg-pink-500', change: '+2.1%' },
          { label: '总分享数', value: '45.6K', icon: Share2, color: 'bg-green-500', change: '+5.8%' },
          { label: '转化订单', value: '3,456', icon: ShoppingCart, color: 'bg-purple-500', change: '+18.3%' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm text-green-600 font-medium">{stat.change}</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-4">品牌效果排行</h3>
          <div className="space-y-4">
            {[
              { brand: '品牌A', views: '456K', engagement: '9.2%', orders: 1234 },
              { brand: '品牌C', views: '389K', engagement: '8.5%', orders: 987 },
              { brand: '品牌B', views: '345K', engagement: '7.8%', orders: 765 },
            ].map((item, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800 dark:text-gray-100' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {index + 1}
                    </span>
                    <h4 className="font-medium">{item.brand}</h4>
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">播放量</p>
                    <p className="font-medium">{item.views}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">互动率</p>
                    <p className="font-medium">{item.engagement}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">转化订单</p>
                    <p className="font-medium">{item.orders}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-4">本周热门结构公式</h3>
          <div className="space-y-3">
            {[
              { name: '痛点-方案-效果结构', usage: 45, avgViews: '23.5K' },
              { name: '快消品促销标准结构', usage: 38, avgViews: '21.2K' },
              { name: '产品种草三段式', usage: 32, avgViews: '19.8K' },
              { name: '对比测评结构', usage: 28, avgViews: '18.5K' },
              { name: '场景化故事结构', usage: 24, avgViews: '17.3K' },
            ].map((formula, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900">{formula.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">使用{formula.usage}次 · 平均播放{formula.avgViews}</p>
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="font-semibold text-lg mb-4">卖点转化效果分析</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">卖点内容</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">使用次数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">平均播放量</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">互动率</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">转化率</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">推荐度</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[
                { selling: '超强续航48小时', usage: 23, views: '34.5K', engagement: '9.8%', conversion: '4.2%', recommend: '高' },
                { selling: '军工级防水设计', usage: 18, views: '28.2K', engagement: '8.5%', conversion: '3.8%', recommend: '高' },
                { selling: '天然有机成分', usage: 15, views: '22.1K', engagement: '7.2%', conversion: '3.1%', recommend: '中' },
              ].map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.selling}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.usage}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.views}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.engagement}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.conversion}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.recommend === '高' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.recommend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
