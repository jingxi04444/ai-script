import { useState } from 'react';

export default function GlobalSettings() {
  const [videoRatio, setVideoRatio] = useState('9:16');
  const [videoType, setVideoType] = useState('');
  const [platform, setPlatform] = useState('');

  const ratios = [
    { value: '9:16', label: '9:16', note: '抖音竖版，默认推荐' },
    { value: '16:9', label: '16:9', note: '横版内容，适合教程类' },
    { value: '1:1', label: '1:1', note: '图文混合，适配多场景' },
  ];

  const videoTypes = [
    '剧情口播',
    '产品展示',
    '教程干货',
    '情感共鸣',
    '其他',
  ];

  const platforms = [
    { value: '抖音', note: '重节奏、强前3秒吸引' },
    { value: '小红书', note: '重场景、重种草表达' },
    { value: '视频号', note: '重信任感与转化链路' },
    { value: '快手', note: '重真实感与生活化表达' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#141414] rounded-xl p-5 border border-[#2a2a2a]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">步骤 1：全局设定</h2>
            <p className="text-sm text-gray-500 mt-1">先确认视频比例、内容类型和投放平台，为后续脚本生成提供统一方向。</p>
          </div>
          <div className="px-3 py-1 rounded-full bg-[#00d084]/10 text-[#00d084] text-xs font-medium border border-[#00d084]/20">
            MVP 必填项
          </div>
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <h3 className="text-lg font-semibold text-white mb-4">视频比例</h3>
        <div className="grid grid-cols-3 gap-3">
          {ratios.map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => setVideoRatio(ratio.value)}
              className={`px-4 py-3 rounded-lg border transition-all ${
                ratio.value === videoRatio
                  ? 'bg-[#00d084] border-[#00d084] text-black font-medium'
                  : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-400 hover:border-[#00d084] hover:text-white'
              }`}
            >
              <div className="text-base">{ratio.label}</div>
              <div className={`text-xs mt-1 ${ratio.value === videoRatio ? 'text-black/70' : 'text-gray-500'}`}>{ratio.note}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <h3 className="text-lg font-semibold text-white mb-4">视频类型</h3>
        <div className="grid grid-cols-3 gap-3">
          {videoTypes.map((type) => (
            <button
              key={type}
              onClick={() => setVideoType(type)}
              className={`px-4 py-3 rounded-lg border transition-all ${
                type === videoType
                  ? 'bg-[#00d084] border-[#00d084] text-black font-medium'
                  : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-400 hover:border-[#00d084] hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <h3 className="text-lg font-semibold text-white mb-4">投放平台</h3>
        <div className="grid grid-cols-4 gap-3">
          {platforms.map((item) => (
            <button
              key={item.value}
              onClick={() => setPlatform(item.value)}
              className={`px-4 py-3 rounded-lg border transition-all ${
                platform === item.value
                  ? 'bg-[#00d084] border-[#00d084] text-black font-medium'
                  : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-400 hover:border-[#00d084] hover:text-white'
              }`}
            >
              <div>{item.value}</div>
              <div className={`text-xs mt-1 ${platform === item.value ? 'text-black/70' : 'text-gray-500'}`}>{item.note}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <h3 className="text-lg font-semibold text-white mb-4">当前设定摘要</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-gray-500 mb-1">视频比例</div>
            <div className="text-white font-medium">{videoRatio}</div>
          </div>
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-gray-500 mb-1">视频类型</div>
            <div className="text-white font-medium">{videoType || '请选择'}</div>
          </div>
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-gray-500 mb-1">投放平台</div>
            <div className="text-white font-medium">{platform || '请选择'}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-3 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all">
          下一步：产品卖点输入
        </button>
      </div>
    </div>
  );
}
