package com.nhai.offlinefieldauth.fieldauth

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class FieldAuthAssetsModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "FieldAuthAssets"

  @ReactMethod
  fun assetExists(assetPath: String, promise: Promise) {
    try {
      reactContext.assets.open(assetPath).use {
        promise.resolve(true)
      }
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun copyModelAsset(assetPath: String, fileName: String, promise: Promise) {
    try {
      val outputDir = File(reactContext.filesDir, "fieldauth-models")
      if (!outputDir.exists()) {
        outputDir.mkdirs()
      }

      val outputFile = File(outputDir, fileName)
      reactContext.assets.open(assetPath).use { input ->
        outputFile.outputStream().use { output ->
          input.copyTo(output)
        }
      }

      val map = Arguments.createMap()
      map.putString("path", outputFile.absolutePath)
      map.putDouble("sizeBytes", outputFile.length().toDouble())
      map.putBoolean("exists", outputFile.exists())
      promise.resolve(map)
    } catch (error: Exception) {
      promise.reject("FIELD_AUTH_ASSET_COPY_FAILED", error.message, error)
    }
  }
}
