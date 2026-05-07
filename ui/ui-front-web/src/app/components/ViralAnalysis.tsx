import { TrendingUp, Copy, Sparkles, Check, Link2, Upload, FileText } from 'lucide-react';
import { useState } from 'react';

interface ViralAnalysisProps {
  onNext?: () => void;
  onBack?: () => void;
}

export default function ViralAnalysis({ onNext, onBack }: ViralAnalysisProps) {
  const [mode, setMode] = useState<'viral' | 'original'>('viral');
  const [script, setScript] = useState('');
  const [videoLink, setVideoLink] = useState('https://www.douyin.com/video/7423456789012345678');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [manualAnalysis, setManualAnalysis] = useState('3 秒强痛点开头 + 场景化放大 + 产品方案 + 效果展示 + 限时优惠；第 2 镜需强化 20 分钟快速加热，第 4 镜 CTA 避免夸张承诺。');
  const [feedback, setFeedback] = useState('');

  const copyStructure = (id: number) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const showFeedback = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(''), 1800);
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

  const originalTemplates = [
    {
      id: 'daily',
      name: '生活痛点转化模板',
      structure: '痛点瞬间 + 情绪放大 + 产品介入 + 前后对比 + 轻 CTA',
      script: '开头用真实生活场景切入用户痛点，中段让产品自然出现解决问题，结尾用低压 CTA 引导收藏或咨询。',
    },
    {
      id: 'review',
      name: '测评种草模板',
      structure: '开箱悬念 + 三项实测 + 反差结果 + 适用人群总结',
      script: '以测评口吻拆解产品核心卖点，每段只验证一个功能，用真实限制条件增加可信度。',
    },
    {
      id: 'story',
      name: '剧情反转模板',
      structure: '误会冲突 + 尴尬升级 + 产品救场 + 人物关系缓和',
      script: '用轻剧情制造冲突，产品作为解决关系和场景问题的关键道具出现，避免硬广直给。',
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
              <button onClick={() => showFeedback('链接解析完成，可继续手动修订分析结果。')} className="px-5 py-3 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all">
                开始解析
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>若链接解析失败，可切换浏览器插件手动提取素材。</span>
              <button onClick={() => setVideoLink('')} className="text-[#00d084] hover:text-[#00e894] transition-all">重新输入链接</button>
            </div>
          </div>

          <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a] space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-white font-semibold">爆款分析手动修订</h3>
                <p className="text-sm text-gray-500 mt-1">解析结果可人工修改后再确认，避免链接数据缺失或结构判断偏差。</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/30">人工确认后生效</span>
            </div>
            <textarea
              className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00d084] resize-none"
              rows={4}
              value={manualAnalysis}
              onChange={(e) => setManualAnalysis(e.target.value)}
              placeholder="手动修订结构公式、镜头作用、平台数据或需要保留/删除的表达..."
            />
            <div className="grid grid-cols-3 gap-3 text-sm">
              {['完整文案', '结构公式', '分镜报告'].map((item) => (
                <button key={item} onClick={() => showFeedback(`${item}已进入可编辑状态。`)} className="py-2 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-300 rounded-lg hover:border-[#00d084] hover:text-white transition-all">
                  修改{item}
                </button>
              ))}
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

                <button onClick={() => showFeedback('已应用该爆款结构，可继续进入脚本生成。')} className="w-full py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all text-sm font-medium">
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
            <button onClick={() => showFeedback('参考文案已上传到原创模式。')} className="w-full py-3 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all flex items-center justify-center gap-2">
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

          <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a] col-span-2">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-white font-semibold">原创爆款模板库脚本</h3>
                <p className="text-sm text-gray-500 mt-1">从可复用的爆款结构模板中选择脚本框架，再结合产品卖点生成原创内容。</p>
              </div>
              <button onClick={() => showFeedback('模板库管理入口已打开。')} className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all text-sm">管理模板库</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {originalTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setScript(template.script)}
                  className="text-left bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#00d084] transition-all"
                >
                  <div className="text-white font-medium">{template.name}</div>
                  <div className="text-xs text-[#00d084] mt-2">{template.structure}</div>
                  <p className="text-sm text-gray-500 leading-6 mt-3">{template.script}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        {feedback && <div className="mr-auto px-4 py-2 rounded-lg bg-[#00d084]/10 text-[#00d084] border border-[#00d084]/20 text-sm">{feedback}</div>}
        <button onClick={onBack} className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all">
          上一步
        </button>
        <button onClick={() => showFeedback('草稿已保存。')} className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all">
          保存草稿
        </button>
        <button onClick={onNext} className="px-4 py-2 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {mode === 'viral' ? '确认分析结果' : '进入原创脚本生成'}
        </button>
      </div>
    </div>
  );
}
