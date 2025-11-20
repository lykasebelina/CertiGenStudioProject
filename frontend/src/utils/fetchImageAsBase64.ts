// src/utils/fetchImageAsBase64.ts

export async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      // keep credentials off for public/private URLs
      method: "GET",
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert image to Base64"));
        }
      };
      reader.onerror = () => reject(new Error("FileReader error while converting image"));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("fetchImageAsBase64 error:", err);
    throw err;
  }
}
