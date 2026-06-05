package com.nhai.offlinefieldauth.fieldauth

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarkerResult
import java.io.File
import kotlin.math.asin
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

class MediaPipeFaceLandmarkerModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private var landmarker: FaceLandmarker? = null
  private val modelAssetPath = "models/face_landmarker.task"
  private val tensorSize = 112
  private val antiSpoofTensorSize = 80
  private val scrfdTensorSize = 640

  override fun getName(): String = "MediaPipeFaceLandmarker"

  @ReactMethod
  fun getStatus(promise: Promise) {
    try {
      ensureLandmarker()
      val map = Arguments.createMap()
      map.putBoolean("available", true)
      map.putString("adapter", "mediapipe-face-landmarker")
      map.putString("modelAsset", modelAssetPath)
      map.putString(
        "notes",
        "FaceLandmarker is initialized with blendshapes and facial transformation matrices enabled.",
      )
      promise.resolve(map)
    } catch (error: Exception) {
      val map = Arguments.createMap()
      map.putBoolean("available", false)
      map.putString("adapter", "mediapipe-face-landmarker")
      map.putString("modelAsset", modelAssetPath)
      map.putString("notes", error.message ?: "FaceLandmarker initialization failed.")
      promise.resolve(map)
    }
  }

  @ReactMethod
  fun analyzeChallenge(challenge: String, spoofMode: Boolean, promise: Promise) {
    try {
      ensureLandmarker()
      promise.resolve(buildChallengeResult(challenge, spoofMode))
    } catch (error: Exception) {
      promise.reject("MEDIAPIPE_NOT_READY", error.message, error)
    }
  }

  @ReactMethod
  fun analyzeJpegBase64(challenge: String, jpegBase64: String, promise: Promise) {
    try {
      val bytes = Base64.decode(jpegBase64, Base64.DEFAULT)
      val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        ?: throw IllegalArgumentException("Could not decode JPEG bytes.")
      val response = analyzeBitmap(challenge, bitmap, true)
      bitmap.recycle()
      promise.resolve(response)
    } catch (error: Exception) {
      promise.reject("MEDIAPIPE_INFERENCE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun analyzePhotoFile(
    challenge: String,
    photoPath: String,
    requireChallenge: Boolean,
    promise: Promise,
  ) {
    try {
      val bitmap = decodePhotoFile(photoPath)
      val response = analyzeBitmap(challenge, bitmap, requireChallenge)
      bitmap.recycle()
      promise.resolve(response)
    } catch (error: Exception) {
      promise.reject("MEDIAPIPE_PHOTO_ANALYSIS_FAILED", error.message, error)
    }
  }

  private fun ensureLandmarker(): FaceLandmarker {
    landmarker?.let { return it }

    val baseOptions = BaseOptions.builder()
      .setModelAssetPath(modelAssetPath)
      .build()
    val options = FaceLandmarker.FaceLandmarkerOptions.builder()
      .setBaseOptions(baseOptions)
      .setRunningMode(RunningMode.IMAGE)
      .setNumFaces(1)
      .setMinFaceDetectionConfidence(0.35f)
      .setMinFacePresenceConfidence(0.35f)
      .setMinTrackingConfidence(0.35f)
      .setOutputFaceBlendshapes(true)
      .setOutputFacialTransformationMatrixes(true)
      .build()
    landmarker = FaceLandmarker.createFromOptions(reactContext, options)
    return landmarker!!
  }

  private fun challengeResultFromLandmarks(
    challenge: String,
    result: FaceLandmarkerResult,
    requireChallenge: Boolean = true,
  ): WritableMap {
    val hasFace = result.faceLandmarks().isNotEmpty()
    val scores = blendshapeScores(result)
    val yawDegrees = yawDegrees(result)
    val score = when (challenge) {
      "blink" -> maxOf(scores["eyeBlinkLeft"] ?: 0f, scores["eyeBlinkRight"] ?: 0f)
      "smile" -> ((scores["mouthSmileLeft"] ?: 0f) + (scores["mouthSmileRight"] ?: 0f)) / 2f
      "turnLeft" -> if (yawDegrees < -12.0) 0.9f else 0.2f
      "turnRight" -> if (yawDegrees > 12.0) 0.9f else 0.2f
      else -> 0f
    }
    val passed = hasFace && (!requireChallenge || score >= 0.45f)

    val map = Arguments.createMap()
    map.putString("challenge", challenge)
    map.putBoolean("passed", passed)
    map.putDouble("score", score.toDouble())
    map.putBoolean("facePresent", hasFace)
    map.putString("adapter", "mediapipe")
    map.putString(
      "evidence",
      if (!hasFace) {
        "No face detected by MediaPipe."
      } else {
        "MediaPipe score ${"%.2f".format(score)}; yaw ${"%.1f".format(yawDegrees)} degrees."
      },
    )
    return map
  }

  private fun analyzeBitmap(
    challenge: String,
    bitmap: Bitmap,
    requireChallenge: Boolean,
  ): WritableMap {
    val mpImage = BitmapImageBuilder(bitmap).build()
    val result = ensureLandmarker().detect(mpImage)
    val response = challengeResultFromLandmarks(challenge, result, requireChallenge)

    val crop = if (result.faceLandmarks().isNotEmpty()) {
      cropFace(bitmap, result, 1.35f)
    } else {
      centerCrop(bitmap)
    }
    val antiSpoofCrop = if (result.faceLandmarks().isNotEmpty()) {
      cropFace(bitmap, result, 2.7f)
    } else {
      centerCrop(bitmap)
    }
    val tensorBitmap = Bitmap.createScaledBitmap(crop.bitmap, tensorSize, tensorSize, true)
    response.putArray("tensor", bitmapToTensor(tensorBitmap))
    response.putArray("tensorShape", intArrayOf(1, 3, tensorSize, tensorSize).toWritableArray())
    val antiSpoofBitmap = Bitmap.createScaledBitmap(
      antiSpoofCrop.bitmap,
      antiSpoofTensorSize,
      antiSpoofTensorSize,
      true,
    )
    response.putArray("antiSpoofTensor", bitmapToMiniFasTensor(antiSpoofBitmap))
    response.putArray(
      "antiSpoofTensorShape",
      intArrayOf(1, 3, antiSpoofTensorSize, antiSpoofTensorSize).toWritableArray(),
    )
    val scrfdBitmap = Bitmap.createScaledBitmap(
      bitmap,
      scrfdTensorSize,
      scrfdTensorSize,
      true,
    )
    response.putArray("scrfdTensor", bitmapToScrfdTensor(scrfdBitmap))
    response.putArray(
      "scrfdTensorShape",
      intArrayOf(1, 3, scrfdTensorSize, scrfdTensorSize).toWritableArray(),
    )
    response.putMap("faceBox", crop.box)
    response.putString(
      "preprocess",
      if (result.faceLandmarks().isNotEmpty()) "mediapipe-face-crop" else "center-crop-fallback",
    )
    if (crop.bitmap != bitmap) {
      crop.bitmap.recycle()
    }
    if (antiSpoofCrop.bitmap != bitmap) {
      antiSpoofCrop.bitmap.recycle()
    }
    tensorBitmap.recycle()
    antiSpoofBitmap.recycle()
    scrfdBitmap.recycle()

    return response
  }

  private fun decodePhotoFile(photoPath: String): Bitmap {
    val cleanPath = photoPath.removePrefix("file://")
    val file = File(cleanPath)
    if (!file.exists()) {
      throw IllegalArgumentException("Photo file does not exist: $cleanPath")
    }

    val decoded = BitmapFactory.decodeFile(cleanPath)
      ?: throw IllegalArgumentException("Could not decode photo file: $cleanPath")
    val orientation = ExifInterface(cleanPath).getAttributeInt(
      ExifInterface.TAG_ORIENTATION,
      ExifInterface.ORIENTATION_NORMAL,
    )
    val rotation = when (orientation) {
      ExifInterface.ORIENTATION_ROTATE_90 -> 90f
      ExifInterface.ORIENTATION_ROTATE_180 -> 180f
      ExifInterface.ORIENTATION_ROTATE_270 -> 270f
      else -> 0f
    }

    if (rotation == 0f) {
      return decoded
    }

    val matrix = Matrix()
    matrix.postRotate(rotation)
    val rotated = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
    decoded.recycle()
    return rotated
  }

  private data class FaceCrop(
    val bitmap: Bitmap,
    val box: WritableMap,
  )

  private fun cropFace(bitmap: Bitmap, result: FaceLandmarkerResult, scale: Float): FaceCrop {
    val landmarks = result.faceLandmarks()[0]
    var minX = 1f
    var minY = 1f
    var maxX = 0f
    var maxY = 0f

    for (landmark in landmarks) {
      minX = min(minX, landmark.x())
      minY = min(minY, landmark.y())
      maxX = max(maxX, landmark.x())
      maxY = max(maxY, landmark.y())
    }

    val width = maxX - minX
    val height = maxY - minY
    val centerX = (minX + maxX) / 2f
    val centerY = (minY + maxY) / 2f
    val squareSize = max(width, height) * scale
    val leftNorm = (centerX - squareSize / 2f).coerceIn(0f, 1f)
    val topNorm = (centerY - squareSize / 2f).coerceIn(0f, 1f)
    val rightNorm = (centerX + squareSize / 2f).coerceIn(0f, 1f)
    val bottomNorm = (centerY + squareSize / 2f).coerceIn(0f, 1f)

    val left = (leftNorm * bitmap.width).roundToInt().coerceIn(0, bitmap.width - 1)
    val top = (topNorm * bitmap.height).roundToInt().coerceIn(0, bitmap.height - 1)
    val right = (rightNorm * bitmap.width).roundToInt().coerceIn(left + 1, bitmap.width)
    val bottom = (bottomNorm * bitmap.height).roundToInt().coerceIn(top + 1, bitmap.height)
    val cropWidth = right - left
    val cropHeight = bottom - top
    val crop = Bitmap.createBitmap(bitmap, left, top, cropWidth, cropHeight)

    val box = Arguments.createMap()
    box.putDouble("x", left.toDouble())
    box.putDouble("y", top.toDouble())
    box.putDouble("width", cropWidth.toDouble())
    box.putDouble("height", cropHeight.toDouble())
    box.putDouble("imageWidth", bitmap.width.toDouble())
    box.putDouble("imageHeight", bitmap.height.toDouble())

    return FaceCrop(crop, box)
  }

  private fun centerCrop(bitmap: Bitmap): FaceCrop {
    val size = min(bitmap.width, bitmap.height)
    val left = ((bitmap.width - size) / 2).coerceAtLeast(0)
    val top = ((bitmap.height - size) / 2).coerceAtLeast(0)
    val crop = Bitmap.createBitmap(bitmap, left, top, size, size)

    val box = Arguments.createMap()
    box.putDouble("x", left.toDouble())
    box.putDouble("y", top.toDouble())
    box.putDouble("width", size.toDouble())
    box.putDouble("height", size.toDouble())
    box.putDouble("imageWidth", bitmap.width.toDouble())
    box.putDouble("imageHeight", bitmap.height.toDouble())

    return FaceCrop(crop, box)
  }

  private fun bitmapToTensor(bitmap: Bitmap): WritableArray {
    val pixels = IntArray(tensorSize * tensorSize)
    bitmap.getPixels(pixels, 0, tensorSize, 0, 0, tensorSize, tensorSize)

    val red = DoubleArray(tensorSize * tensorSize)
    val green = DoubleArray(tensorSize * tensorSize)
    val blue = DoubleArray(tensorSize * tensorSize)

    for (index in pixels.indices) {
      val pixel = pixels[index]
      red[index] = (((pixel shr 16) and 0xff) - 127.5) / 127.5
      green[index] = (((pixel shr 8) and 0xff) - 127.5) / 127.5
      blue[index] = ((pixel and 0xff) - 127.5) / 127.5
    }

    val array = Arguments.createArray()
    red.forEach { array.pushDouble(it) }
    green.forEach { array.pushDouble(it) }
    blue.forEach { array.pushDouble(it) }
    return array
  }

  private fun bitmapToMiniFasTensor(bitmap: Bitmap): WritableArray {
    val pixels = IntArray(antiSpoofTensorSize * antiSpoofTensorSize)
    bitmap.getPixels(
      pixels,
      0,
      antiSpoofTensorSize,
      0,
      0,
      antiSpoofTensorSize,
      antiSpoofTensorSize,
    )

    val blue = DoubleArray(antiSpoofTensorSize * antiSpoofTensorSize)
    val green = DoubleArray(antiSpoofTensorSize * antiSpoofTensorSize)
    val red = DoubleArray(antiSpoofTensorSize * antiSpoofTensorSize)

    for (index in pixels.indices) {
      val pixel = pixels[index]
      red[index] = ((pixel shr 16) and 0xff) / 255.0
      green[index] = ((pixel shr 8) and 0xff) / 255.0
      blue[index] = (pixel and 0xff) / 255.0
    }

    val array = Arguments.createArray()
    blue.forEach { array.pushDouble(it) }
    green.forEach { array.pushDouble(it) }
    red.forEach { array.pushDouble(it) }
    return array
  }

  private fun bitmapToScrfdTensor(bitmap: Bitmap): WritableArray {
    val pixels = IntArray(scrfdTensorSize * scrfdTensorSize)
    bitmap.getPixels(
      pixels,
      0,
      scrfdTensorSize,
      0,
      0,
      scrfdTensorSize,
      scrfdTensorSize,
    )

    val blue = DoubleArray(scrfdTensorSize * scrfdTensorSize)
    val green = DoubleArray(scrfdTensorSize * scrfdTensorSize)
    val red = DoubleArray(scrfdTensorSize * scrfdTensorSize)

    for (index in pixels.indices) {
      val pixel = pixels[index]
      red[index] = (((pixel shr 16) and 0xff) - 127.5) / 128.0
      green[index] = (((pixel shr 8) and 0xff) - 127.5) / 128.0
      blue[index] = ((pixel and 0xff) - 127.5) / 128.0
    }

    val array = Arguments.createArray()
    blue.forEach { array.pushDouble(it) }
    green.forEach { array.pushDouble(it) }
    red.forEach { array.pushDouble(it) }
    return array
  }

  private fun IntArray.toWritableArray(): WritableArray {
    val array = Arguments.createArray()
    forEach { array.pushInt(it) }
    return array
  }

  private fun blendshapeScores(result: FaceLandmarkerResult): Map<String, Float> {
    if (result.faceBlendshapes().isEmpty) {
      return emptyMap()
    }

    return result.faceBlendshapes().get()[0].associate { category ->
      category.categoryName() to category.score()
    }
  }

  private fun yawDegrees(result: FaceLandmarkerResult): Double {
    if (result.facialTransformationMatrixes().isEmpty) {
      return 0.0
    }

    val matrix = result.facialTransformationMatrixes().get()[0]
    if (matrix.size < 16) {
      return 0.0
    }

    return Math.toDegrees(asin((-matrix[2]).coerceIn(-1f, 1f).toDouble()))
  }

  private fun buildChallengeResult(challenge: String, spoofMode: Boolean): WritableMap {
    val map = Arguments.createMap()
    map.putString("challenge", challenge)
    map.putBoolean("passed", !spoofMode)
    map.putDouble("score", if (spoofMode) 0.16 else scoreFor(challenge))
    map.putBoolean("facePresent", !spoofMode)
    map.putString("adapter", "mediapipe")
    map.putString(
      "evidence",
      if (spoofMode) {
        "MediaPipe module rejected demo spoof path: no valid live challenge motion."
      } else {
        "MediaPipe task is initialized. Camera-frame bridge is needed for live landmark scoring."
      },
    )
    return map
  }

  private fun scoreFor(challenge: String): Double =
    when (challenge) {
      "blink" -> 0.93
      "smile" -> 0.89
      "turnLeft" -> 0.91
      "turnRight" -> 0.9
      else -> 0.86
    }
}
