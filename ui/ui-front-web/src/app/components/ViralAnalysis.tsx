import { TrendingUp, Copy, Sparkles, Check, Link2, Upload, FileText } from 'lucide-react';
import { useState } from 'react';

export default function ViralAnalysis() {
  const [mode, setMode] = useState<'viral' | 'original'>('viral');
  const [script, setScript] = useState('');
  const [videoLink, setVideoLink] = useState('https://www.douyin.com/video/7423456789012345678');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const copyStructure = (id: number) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const viralVideos = [
    {
      id: 1,
      title: '宠物店日常-温馨治愈系',
      platform: '抖音',
      views: '238万',
      likes: '15.6万',
      comments: '1.8万',
      favorites: '3.2万',
      author: '宠物店观察局',
      structure: ['开场吸睛 (0-3s)', '产品展示 (3-8s)', '使用场景 (8-12s)', '结尾引导 (12-15s)'],
      report: ['第 1 镜：3 秒内抛出痛点，快速建立代入感', '第 2 镜：展示产品解决方案，完成卖点植入', '第 3 镜：切换真实使用场景，增强可信度', '第 4 镜：用限时感和 CTA 收口，促进转化'],
    },
    {
      id: 2,
      title: '专业宠物护理展示',
      platform: '小红书',
      views: '126万',
      likes: '8.2万',
      comments: '0.6万',
      favorites: '1.7万',
      author: '打工人的加热饭日记',
      structure: ['痛点切入 (0-2s)', '解决方案 (2-7s)', '效果对比 (7-12s)', 'CTA (12-15s)'],
      report: ['第 1 镜：先用加班、冷饭场景触发痛点共鸣', '第 2 镜：重点展示产品的加热效率和便携性', '第 3 镜：用前后对比强化购买理由', '第 4 镜：引导评论区咨询或领券'],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">步骤 3：爆款链接 / 原创</h2>
          <p className="text-sm text-gray-500 mt-1">支持爆款复刻和原创两种模式，MVP 重点补齐链接解析与结构公式输出。</p>
        </div>
      </div>

      <div className="flex gap-3">
        {[
          { key: 'viral', label: '爆款复刻（推荐）' },
          { key: 'original', label: '原创模式' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setMode(item.key as 'viral' | 'original')}
            className={`px-5 py-3 rounded-lg border transition-all ${
              mode === item.key
                ? 'bg-[#00d084] border-[#00d084] text-black font-medium'
                : 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-400 hover:border-[#00d084] hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'viral' ? (
        <>
          <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a] space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Link2 className="w-4 h-4 text-[#00d084]" />
              输入爆款链接
            </div>
            <div className="flex gap-3">
              <input
                className="flex-1 bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00d084]"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                placeholder="支持抖音、小红书视频链接"
              />
              <button className="px-5 py-3 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all">
                开始解析
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>若链接解析失败，可切换浏览器插件手动提取素材。</span>
              <button className="text-[#00d084] hover:text-[#00e894] transition-all">重新输入链接</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {viralVideos.map((video) => (
              <div key={video.id} className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a] space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold mb-2">{video.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-gray-500">{video.platform}</span>
                      <span className="text-[#00d084] flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {video.views} 播放
                      </span>
                      <span className="text-gray-400">{video.likes} 点赞</span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyStructure(video.id)}
                    className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-all"
                  >
                    {copiedId === video.id ? (
                      <Check className="w-4 h-4 text-[#00d084]" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-[#0a0a0a] rounded-lg p-3 border border-[#2a2a2a]">
                    <div className="text-gray-500 mb-1">账号名称</div>
                    <div className="text-white">{video.author}</div>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 border border-[#2a2a2a]">
                    <div className="text-gray-500 mb-1">互动数据</div>
                    <div className="text-white">评 {video.comments} / 藏 {video.favorites}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 font-medium mb-2">结构公式</div>
                  <div className="space-y-2">
                    {video.structure.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-[#00d084]/20 text-[#00d084] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <span className="text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 font-medium mb-2">拉片式分镜报告</div>
                  <div className="space-y-2">
                    {video.report.map((item) => (
                      <div key={item} className="text-sm text-gray-400 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all text-sm font-medium">
                  确认分析结果并应用
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a] space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <FileText className="w-4 h-4 text-[#00d084]" />
              自定义结构公式
            </div>
            <textarea
              className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00d084] resize-none"
              rows={7}
              placeholder="例如：3秒强痛点开头 + 场景化问题放大 + 产品方案 + 使用效果 + 评论区引导"
            />
            <button className="w-full py-3 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              上传参考文案
            </button>
          </div>

          <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
            <h3 className="text-white font-semibold mb-4">原创脚本编写</h3>
            <textarea
              className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00d084] resize-none"
              rows={11}
              placeholder="在这里输入原创脚本方向、参考片段或希望 AI 遵循的文风..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all">
          保存草稿
        </button>
        <button className="px-4 py-2 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {mode === 'viral' ? '确认分析结果' : '进入原创脚本生成'}
        </button>
      </div>
    </div>
  );
}
