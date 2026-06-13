export class YouTubeMediaUploader {
  constructor(options) {
    this.file = options.file;
    this.token = options.token;
    this.metadata = options.metadata;
    this.onComplete = options.onComplete;
    this.onError = options.onError || console.error;
    this.onProgress = options.onProgress || console.log;
  }

  async upload() {
    try {
      this.onProgress({ phase: 'initializing' });
      // 1. Initialize resumable upload
      const initUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
      const initRes = await fetch(initUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': this.file.size.toString(),
          'X-Upload-Content-Type': this.file.type
        },
        body: JSON.stringify(this.metadata)
      });

      if (!initRes.ok) {
        const errText = await initRes.text();
        throw new Error('Phase B (Init) Failed: ' + initRes.status + ' ' + errText);
      }

      const uploadUrl = initRes.headers.get('Location');
      if (!uploadUrl) {
        throw new Error('Phase B (Init) Failed: No upload URL returned from YouTube API');
      }

      // 2. Upload using XMLHttpRequest to get progress events and detailed tracking
      this.onProgress({ phase: 'uploading', loaded: 0, total: this.file.size });
      
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', this.file.type);
      xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          this.onProgress({ phase: 'uploading', loaded: e.loaded, total: e.total, p: percentComplete });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          this.onProgress({ phase: 'completed' });
          this.onComplete(xhr.responseText);
        } else {
          this.onError(new Error(`Phase B (Upload) Failed: ${xhr.status} ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        this.onError(new Error('Phase B (Upload) Network/CORS Error. The request was blocked, or the connection failed.'));
      };

      xhr.send(this.file);
      
    } catch (error) {
      this.onError(error);
    }
  }
}

