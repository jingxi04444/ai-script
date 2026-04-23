import { Mic, Upload, Volume2, User } from 'lucide-react';
import { useState } from 'react';

export default function Dubbing() {
  const [selectedVoice, setSelectedVoice] = useState(1);
  const [lipSyncEnabled, setLipSyncEnabled] = useState(true);

  const voices = [
    { id: 1, name: '甜美女声', type: '女声', style: '温柔' },
    { id: 2, name: '专业男声', type: '男声', style: '稳重' },
    { id: 3, name: '活力女声', type: '女声', style: '青春' },
    { id: 4, name: '磁性男声', type: '男声', style: '低沉' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">配音 & 对口型</h2>
          <p className="text-sm text-gray-500 mt-1">AI 配音 · 自动对口型</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all flex items-center gap-2">
            <Upload className="w-4 h-4" />
            上传音频
          </button>
          <button className="px-4 py-2 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all flex items-center gap-2">
            <Mic className="w-4 h-4" />
            AI 生成配音
          </button>
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <h3 className="text-white font-semibold mb-4">选择 AI 音色</h3>
        <div className="grid grid-cols-4 gap-4">
          {voices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              className={`p-4 rounded-lg border transition-all ${
                voice.id === selectedVoice
                  ? 'bg-[#00d084]/10 border-[#00d084]'
                  : 'bg-[#0a0a0a] border-[#3a3a3a] hover:border-[#00d084]'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    voice.id === selectedVoice ? 'bg-[#00d084]' : 'bg-[#2a2a2a]'
                  }`}
                >
                  <User className={`w-6 h-6 ${voice.id === selectedVoice ? 'text-black' : 'text-gray-500'}`} />
                </div>
                <div className="text-center">
                  <div className={`text-sm font-medium ${voice.id === selectedVoice ? 'text-white' : 'text-gray-400'}`}>
                    {voice.name}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {voice.type} · {voice.style}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // 播放试听
                  }}
                  className="mt-2 p-2 bg-[#2a2a2a] rounded-full hover:bg-[#3a3a3a] transition-all"
                >
                  <Volume2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <h3 className="text-white font-semibold mb-4">配音文本</h3>
        <div className="space-y-4">
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#3a3a3a]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">镜号01</span>
              <span className="text-xs text-gray-600">3秒</span>
            </div>
            <p className="text-white text-sm">
              上海最温馨的宠物店，为您的爱宠提供专业护理服务。
            </p>
          </div>
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#3a3a3a]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">镜号02</span>
              <span className="text-xs text-gray-600">4秒</span>
            </div>
            <p className="text-white text-sm">我们的专业团队，让每一只宠物都能享受到贴心呵护。</p>
          </div>
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">对口型设置</h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={lipSyncEnabled}
              onChange={(e) => setLipSyncEnabled(e.target.checked)}
            />
            <div className="w-11 h-6 bg-[#3a3a3a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00d084]"></div>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">同步精度</label>
            <select className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00d084]">
              <option>高精度（推荐）</option>
              <option>标准</option>
              <option>快速</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">口型强度</label>
            <select className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00d084]">
              <option>自然</option>
              <option>明显</option>
              <option>夸张</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button className="px-6 py-3 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all">
          保存设置
        </button>
        <button className="px-6 py-3 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all">
          开始处理
        </button>
      </div>
    </div>
  );
}
