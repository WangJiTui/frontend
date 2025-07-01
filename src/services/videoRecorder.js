/**
 * 视频录制服务
 * 负责管理摄像头录制功能
 */

/**
 * VideoRecorder类 - 视频录制管理器
 * 功能：
 * - 管理摄像头录制状态
 * - 处理视频流获取和录制
 * - 提供录制控制接口
 */
class VideoRecorder {
  constructor() {
    this.mediaRecorder = null; // MediaRecorder实例
    this.recordedChunks = []; // 录制的视频块
    this.isRecording = false; // 录制状态
    this.stream = null; // 媒体流
  }

  /**
   * 开始录制
   * 获取摄像头权限并开始录制视频
   * @returns {Promise<boolean>} 录制是否成功开始
   */
  async startRecording() {
    try {
      // 获取摄像头和麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // 创建MediaRecorder实例
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      // 清空之前的录制数据
      this.recordedChunks = [];

      // 监听数据可用事件
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // 开始录制
      this.mediaRecorder.start();
      this.isRecording = true;

      console.log('视频录制已开始');
      return true;
    } catch (error) {
      console.error('开始录制失败:', error);
      throw new Error('无法访问摄像头或麦克风');
    }
  }

  /**
   * 停止录制
   * 停止录制并返回录制的视频数据
   * @returns {Promise<Blob>} 录制的视频文件
   */
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('没有正在进行的录制'));
        return;
      }

      // 监听录制完成事件
      this.mediaRecorder.onstop = () => {
        try {
          // 创建视频Blob
          const videoBlob = new Blob(this.recordedChunks, {
            type: 'video/webm'
          });

          // 停止所有媒体轨道
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
          }

          // 重置状态
          this.isRecording = false;
          this.mediaRecorder = null;
          this.stream = null;
          this.recordedChunks = [];

          console.log('视频录制已停止');
          resolve(videoBlob);
        } catch (error) {
          console.error('停止录制失败:', error);
          reject(error);
        }
      };

      // 停止录制
      this.mediaRecorder.stop();
    });
  }

  /**
   * 获取录制状态
   * @returns {boolean} 是否正在录制
   */
  getRecordingState() {
    return this.isRecording;
  }

  /**
   * 暂停录制
   */
  pauseRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
      console.log('视频录制已暂停');
    }
  }

  /**
   * 恢复录制
   */
  resumeRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.resume();
      console.log('视频录制已恢复');
    }
  }

  /**
   * 获取当前媒体流
   * @returns {MediaStream|null} 当前媒体流
   */
  getStream() {
    return this.stream;
  }
}

export default VideoRecorder; 