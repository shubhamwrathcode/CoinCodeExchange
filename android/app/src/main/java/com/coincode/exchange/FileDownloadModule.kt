package com.coincode.exchange

import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream

class FileDownloadModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "FileDownloadModule"
    }

    @ReactMethod
    fun saveToDownloads(fileName: String, content: String, mimeType: String, promise: Promise) {
        try {
            var saved = false
            var finalPath = ""

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }

                val resolver = reactContext.contentResolver
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)

                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { outputStream ->
                        outputStream.write(content.toByteArray(Charsets.UTF_8))
                        outputStream.flush()
                        saved = true
                        finalPath = "Downloads/$fileName"
                    }
                }
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) {
                    downloadsDir.mkdirs()
                }
                val file = File(downloadsDir, fileName)
                FileOutputStream(file).use { outputStream ->
                    outputStream.write(content.toByteArray(Charsets.UTF_8))
                    outputStream.flush()
                    saved = true
                    finalPath = file.absolutePath
                }

                val downloadManager = reactContext.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
                downloadManager?.addCompletedDownload(
                    fileName,
                    "Statement download",
                    true,
                    mimeType,
                    file.absolutePath,
                    file.length(),
                    true
                )
            }

            if (saved) {
                promise.resolve(finalPath)
            } else {
                promise.reject("SAVE_FAILED", "Could not save file to Downloads")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.localizedMessage ?: "Unknown error saving file")
        }
    }
}
