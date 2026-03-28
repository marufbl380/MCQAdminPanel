function sanitizeFileName(fileName) {
  const safe = String(fileName || "export.txt")
    .trim()
    .replace(/[^\w.\-]+/g, "_");
  return safe || "export.txt";
}

function normalizeMimeType(mimeType, fileName) {
  if (typeof mimeType === "string" && mimeType.trim()) {
    return mimeType.split(";")[0].trim();
  }
  const lowerName = String(fileName || "").toLowerCase();
  if (lowerName.endsWith(".json")) {
    return "application/json";
  }
  if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
    return "text/html";
  }
  return "text/plain";
}

function getErrorMessage(err, fallback) {
  if (!err) {
    return fallback;
  }
  if (typeof err === "string" && err.trim()) {
    return err.trim();
  }
  if (typeof err.message === "string" && err.message.trim()) {
    return err.message.trim();
  }
  return fallback;
}

async function shareFileFallback(fileName, content) {
  try {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const path = "mcq_export_" + Date.now() + "_" + sanitizeFileName(fileName);
    const writeResult = await Filesystem.writeFile({
      path,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });
    const fileUri =
      writeResult && writeResult.uri
        ? writeResult.uri
        : (await Filesystem.getUri({ path, directory: Directory.Cache })).uri;
    await Share.share({
      title: fileName,
      dialogTitle: "Save or share file",
      files: [fileUri]
    });
    return {
      mode: "share-file",
      uri: fileUri
    };
  } catch (err) {
    if (err && err.name === "AbortError") {
      return { mode: "cancelled" };
    }
    console.warn("shareFileFallback", err);
    return {
      mode: "error",
      message: getErrorMessage(err, "The native share sheet could not be opened.")
    };
  }
}

export async function saveFileNative(fileName, content, mimeType) {
  try {
    const { Capacitor, registerPlugin } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    const safeFileName = sanitizeFileName(fileName);
    const textContent = typeof content === "string" ? content : String(content ?? "");
    const normalizedMimeType = normalizeMimeType(mimeType, safeFileName);
    const platform = typeof Capacitor.getPlatform === "function" ? Capacitor.getPlatform() : "";

    if (platform === "android") {
      const NativeDownloads = registerPlugin("NativeDownloads");
      try {
        const result = await NativeDownloads.saveFile({
          fileName: safeFileName,
          content: textContent,
          mimeType: normalizedMimeType
        });
        return {
          mode: "native-download",
          uri: result && result.uri ? result.uri : "",
          pathLabel: result && result.pathLabel ? result.pathLabel : "Downloads/" + safeFileName
        };
      } catch (err) {
        console.warn("saveFileNative android", err);
        return {
          mode: "error",
          message: getErrorMessage(err, "The Android download save failed.")
        };
      }
    }

    return await shareFileFallback(safeFileName, textContent);
  } catch (err) {
    console.warn("saveFileNative", err);
    return null;
  }
}

export async function shareFileNative(fileName, content, mimeType) {
  return saveFileNative(fileName, content, mimeType);
}
