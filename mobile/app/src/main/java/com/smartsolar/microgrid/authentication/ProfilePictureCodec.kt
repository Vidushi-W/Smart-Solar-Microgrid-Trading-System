
package com.smartsolar.microgrid.authentication

import android.content.ContentResolver
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import java.io.ByteArrayOutputStream
import java.io.IOException

object ProfilePictureCodec {
    private const val MAXIMUM_JPEG_BYTES = 750_000

    fun encodeJpeg(contentResolver: ContentResolver, uri: Uri): String {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
            ?: throw IOException("Could not open the selected image.")
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            throw IOException("The selected file is not a valid image.")
        }

        var sampleSize = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / sampleSize > 1024) {
            sampleSize *= 2
        }
        val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }
        val bitmap = contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
            ?: throw IOException("Could not decode the selected image.")

        return try {
            encodeResized(bitmap)
        } finally {
            bitmap.recycle()
        }
    }

    private fun encodeResized(source: Bitmap): String {
        var scale = minOf(1f, 512f / maxOf(source.width, source.height))
        while (true) {
            val width = maxOf(1, (source.width * scale).toInt())
            val height = maxOf(1, (source.height * scale).toInt())
            val resized = Bitmap.createScaledBitmap(source, width, height, true)
            try {
                for (quality in listOf(82, 72, 62, 52, 42)) {
                    val bytes = ByteArrayOutputStream().use { output ->
                        resized.compress(Bitmap.CompressFormat.JPEG, quality, output)
                        output.toByteArray()
                    }
                    if (bytes.size <= MAXIMUM_JPEG_BYTES) {
                        return "data:image/jpeg;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
                    }
                }
            } finally {
                if (resized !== source) resized.recycle()
            }
            scale *= 0.75f
            if (scale < 0.1f) {
                throw IOException("The selected image is too large to use as a profile picture.")
            }
        }
    }
}
