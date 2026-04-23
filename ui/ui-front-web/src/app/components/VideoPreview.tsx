import { Play, Pause, Download, Share2, Clock } from 'lucide-react';
import { useState } from 'react';

export default function VideoPreview() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(3);
  const [selectedClip, setSelectedClip] = useState(0);
  const timeline = [
    { id: 1, duration: 3, thumbnail: '', title: '镜号01' },
    { id: 2, duration: 4, thumbnail: '', title: '镜号02' },
    { id: 3, duration: 2, thumbnail: '', title: '镜号03' },
    { id: 4, duration: 3, thumbnail: '', title: '镜号04' },
    { id: 5, duration: 2, thumbnail: '', title: '镜号05' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">视频预览</h2>
          <p className="text-sm text-gray-500 mt-1">总时长 14 秒 · 9:16 竖屏</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            分享
          </button>
          <button className="px-4 py-2 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出视频
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-[#0a0a0a] rounded-xl border border-[#2a2a2a] aspect-video flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d084]/10 to-transparent" />
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="relative z-10 w-20 h-20 rounded-full bg-[#00d084] flex items-center justify-center hover:bg-[#00e894] transition-all shadow-2xl"
            >
              {isPlaying ? (
                <Pause className="w-10 h-10 text-black" fill="currentColor" />
              ) : (
                <Play className="w-10 h-10 text-black ml-1" fill="currentColor" />
              )}
            </button>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center justify-between text-xs text-white mb-2">
                  <span>00:03</span>
                  <span>00:14</span>
                </div>
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-[#00d084] rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-[#1e1e1e] rounded-xl border border-[#2a2a2a] p-4">
            <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>时间轴</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {timeline.map((clip, idx) => (
                <button
                  key={clip.id}
                  onClick={() => setSelectedClip(idx)}
                  className={`flex-shrink-0 ${
                    idx === selectedClip ? 'border-2 border-[#00d084]' : 'border border-[#3a3a3a]'
                  } rounded-lg overflow-hidden bg-[#0a0a0a] hover:border-[#00d084] transition-all cursor-pointer`}
                  style={{ width: `${clip.duration * 40}px` }}
                >
                  <div className="h-16 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <span className="text-xs text-gray-400">{clip.title}</span>
                  </div>
                  <div className="px-2 py-1 text-xs text-center text-gray-500">{clip.duration}s</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[#1e1e1e] rounded-xl p-4 border border-[#2a2a2a]">
            <h3 className="text-white font-medium mb-3">视频信息</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">分辨率</span>
                <span className="text-white">1080x1920</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">帧率</span>
                <span className="text-white">30 fps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">码率</span>
                <span className="text-white">8 Mbps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">文件大小</span>
                <span className="text-white">约 14 MB</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] rounded-xl p-4 border border-[#2a2a2a]">
            <h3 className="text-white font-medium mb-3">导出设置</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">视频格式</label>
                <select className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00d084]">
                  <option>MP4 (推荐)</option>
                  <option>MOV</option>
                  <option>AVI</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">画质</label>
                <select className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00d084]">
                  <option>高清 1080p</option>
                  <option>超清 2K</option>
                  <option>标清 720p</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#00d084]/10 to-transparent rounded-xl p-4 border border-[#00d084]/30">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00d084] flex items-center justify-center flex-shrink-0">
                <span className="text-black font-bold text-sm">AI</span>
              </div>
              <div>
                <p className="text-white text-sm mb-1">智能优化建议</p>
                <p className="text-gray-400 text-xs">
                  检测到第3个镜头过渡略显生硬，建议添加淡入淡出效果
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
