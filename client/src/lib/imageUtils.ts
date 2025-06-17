/**
 * Converts a File object to a base64 encoded string
 * @param file The file to convert
 * @returns Promise resolving to a base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Creates an object URL from a base64 string
 * @param base64 The base64 string
 * @param mimeType The MIME type of the image
 * @returns A blob URL that can be used as an image source
 */
export function base64ToObjectUrl(base64: string, mimeType: string): string {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  return URL.createObjectURL(blob);
}

/**
 * Resizes an image file to a maximum width/height while maintaining aspect ratio
 * @param file The image file to resize
 * @param maxWidth Maximum width of the resized image
 * @param maxHeight Maximum height of the resized image
 * @param quality JPEG quality (0-1)
 * @returns Promise resolving to a File object containing the resized image
 */
export function resizeImage(
  file: File,
  maxWidth: number = 1600,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }
      }
      
      // Create canvas and draw image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert canvas to Blob
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob from canvas"));
          return;
        }
        
        // Create new File object
        const resizedFile = new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now()
        });
        
        resolve(resizedFile);
      }, file.type, quality);
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
  });
}

/**
 * Validates an image file based on type, size, and dimensions
 * @param file The image file to validate
 * @param maxSizeMB Maximum file size in MB
 * @returns Promise resolving to true if valid, or error message if invalid
 */
export function validateImage(file: File, maxSizeMB: number = 10): Promise<true | string> {
  return new Promise((resolve) => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      resolve('File must be a valid image (JPEG, PNG, GIF, WEBP)');
      return;
    }
    
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      resolve(`File size must be less than ${maxSizeMB}MB`);
      return;
    }
    
    // All checks passed
    resolve(true);
  });
}
