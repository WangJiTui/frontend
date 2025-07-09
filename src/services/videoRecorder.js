class VideoRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.stream = null;
  }

  async startRecording() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      console.log('视频录制已开始');
      return true;
    } catch (error) {
      console.error('开始录制失败:', error);
      throw new Error('无法访问摄像头或麦克风');
    }
  }

  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('没有正在进行的录制'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const videoBlob = new Blob(this.recordedChunks, {
            type: 'video/webm'
          });

          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
          }

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

      this.mediaRecorder.stop();
    });
  }

  getRecordingState() {
    return this.isRecording;
  }

  pauseRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
      console.log('视频录制已暂停');
    }
  }

  resumeRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.resume();
      console.log('视频录制已恢复');
    }
  }

  getStream() {
    return this.stream;
  }
}

export default VideoRecorder; 