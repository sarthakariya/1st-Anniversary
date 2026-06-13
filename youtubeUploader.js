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
        throw new Error('Failed to initialize YouTube upload: ' + await initRes.text());
      }

      const uploadUrl = initRes.headers.get('Location');
      if (!uploadUrl) {
        throw new Error('No upload URL returned from YouTube API');
      }

      // 2. Upload the file chunks (or whole file if small enough, but doing whole file using PUT)
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': this.file.type
        },
        body: this.file
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file content to YouTube: ' + await uploadRes.text());
      }

      const responseString = await uploadRes.text();
      this.onComplete(responseString);
      
    } catch (error) {
      this.onError(error);
    }
  }
}
