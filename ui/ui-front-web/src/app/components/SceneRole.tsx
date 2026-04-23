import { Upload, Download, Grid3x3 } from 'lucide-react';
import { useState } from 'react';

export default function SceneRole() {
  const [activeTab, setActiveTab] = useState('全部');
  const scenes = [
    { id: 1, title: '北欧现代', type: '场景', img: '/src/imports/场景角色1.png' },
    { id: 2, title: '南欧现代', type: '场景', img: '/src/imports/场景角色1.png' },
    { id: 3, title: '西欧现代', type: '场景', img: '/src/imports/场景角色1.png' },
    { id: 4, title: '东欧现代', type: '场景', img: '/src/imports/场景角色1.png' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">场景角色道具</h2>
          <p className="text-sm text-gray-500 mt-1">镜数：14 镜</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all flex items-center gap-2">
            <Upload className="w-4 h-4" />
            上传素材
          </button>
          <button className="px-4 py-2 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all flex items-center gap-2">
            <Grid3x3 className="w-4 h-4" />
            AI生成场景
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#2a2a2a]">
        {['全部', '场景', '角色', '道具'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-all ${
              tab === activeTab
                ? 'text-[#00d084] border-b-2 border-[#00d084]'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">镜号01: 上海写字楼办公室-林楠宠物店</h3>
          <span className="text-sm text-gray-500">待配置场景图</span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {scenes.map((scene) => (
            <div key={scene.id} className="group cursor-pointer">
              <div className="relative bg-[#0a0a0a] rounded-lg border border-[#3a3a3a] overflow-hidden aspect-[3/4] hover:border-[#00d084] transition-all">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-white/20 backdrop-blur-sm text-white text-xs rounded hover:bg-white/30 transition-all">
                      预览
                    </button>
                    <button className="flex-1 py-2 bg-white/20 backdrop-blur-sm text-white text-xs rounded hover:bg-white/30 transition-all">
                      编辑
                    </button>
                    <button className="flex-1 py-2 bg-[#00d084] text-black text-xs font-medium rounded hover:bg-[#00e894] transition-all">
                      下载
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm text-white font-medium">{scene.title}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-[#0a0a0a] rounded-lg border border-dashed border-[#3a3a3a] text-center">
          <p className="text-gray-500 text-sm mb-2">多选生成其他分镜图，或者拖拽图片到这里</p>
          <button className="text-[#00d084] text-sm hover:text-[#00e894] transition-all">
            点击上传
          </button>
        </div>
      </div>
    </div>
  );
}
